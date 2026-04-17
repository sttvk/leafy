import { useEffect, useState, type FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  createBook,
  fetchBook,
  updateBook,
  type BookDetailDto,
  type BookListDto,
  type CreateBookRequest,
} from "@/api/books"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  validateRequired,
  validateUrl,
  validateYear,
} from "@/lib/validation"
import { MESSAGES } from "@/lib/messages"

interface BookFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  book?: BookListDto | null
}

interface FormState {
  title: string
  author: string
  isbn: string
  publicationYear: string
  genre: string
  description: string
  coverImageUrl: string
}

const INITIAL_FORM_STATE: Readonly<FormState> = {
  title: "",
  author: "",
  isbn: "",
  publicationYear: "",
  genre: "",
  description: "",
  coverImageUrl: "",
}

function buildFormStateFromDetail(detail: BookDetailDto): FormState {
  return {
    title: detail.title,
    author: detail.author,
    isbn: detail.isbn ?? "",
    publicationYear: detail.publicationYear?.toString() ?? "",
    genre: detail.genre ?? "",
    description: detail.description ?? "",
    coverImageUrl: detail.coverImageUrl ?? "",
  }
}

function BookFormModal({ open, onOpenChange, onSuccess, book }: BookFormModalProps) {
  const isEditMode = book != null
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM_STATE })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const { data: bookDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["book", book?.id],
    queryFn: () => fetchBook(book!.id),
    enabled: isEditMode && open,
  })

  useEffect(() => {
    if (isEditMode && bookDetail) {
      setForm(buildFormStateFromDetail(bookDetail))
    }
  }, [isEditMode, bookDetail])

  function updateField(field: keyof FormState, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
    markTouched(field)
  }

  function markTouched(field: string): void {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }

  function markAllTouched(fields: readonly string[]): void {
    setTouched((prev) => {
      const next: Record<string, boolean> = { ...prev }
      for (const f of fields) {
        next[f] = true
      }
      return next
    })
  }

  const errors = {
    title: touched.title ? validateRequired(form.title, "Title") : null,
    author: touched.author ? validateRequired(form.author, "Author") : null,
    publicationYear: touched.publicationYear ? validateYear(form.publicationYear) : null,
    coverImageUrl: touched.coverImageUrl ? validateUrl(form.coverImageUrl) : null,
  }

  function hasErrors(errs: Record<string, string | null>): boolean {
    return Object.values(errs).some((e) => e !== null)
  }

  function resetForm(): void {
    setForm({ ...INITIAL_FORM_STATE })
    setErrorMessage(null)
    setTouched({})
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)

    const allFields = ["title", "author", "publicationYear", "coverImageUrl"] as const
    markAllTouched(allFields)

    const submitErrors = {
      title: validateRequired(form.title, "Title"),
      author: validateRequired(form.author, "Author"),
      publicationYear: validateYear(form.publicationYear),
      coverImageUrl: validateUrl(form.coverImageUrl),
    }
    if (hasErrors(submitErrors)) return

    const trimmedTitle = form.title.trim()
    const trimmedAuthor = form.author.trim()

    const parsedYear = form.publicationYear.trim()
      ? Number(form.publicationYear)
      : undefined

    const payload: CreateBookRequest = {
      title: trimmedTitle,
      author: trimmedAuthor,
      ...(form.isbn.trim() && { isbn: form.isbn.trim() }),
      ...(parsedYear !== undefined && { publicationYear: parsedYear }),
      ...(form.genre.trim() && { genre: form.genre.trim() }),
      ...(form.description.trim() && { description: form.description.trim() }),
      ...(form.coverImageUrl.trim() && { coverImageUrl: form.coverImageUrl.trim() }),
    }

    setIsSubmitting(true)
    try {
      if (isEditMode) {
        await updateBook(book.id, payload)
        await queryClient.invalidateQueries({ queryKey: ["book", book.id] })
        toast.success(MESSAGES.books.updateSuccess)
      } else {
        await createBook(payload)
        toast.success(MESSAGES.books.addSuccess)
      }
      onSuccess()
      handleOpenChange(false)
    } catch (error: unknown) {
      toast.error(isEditMode ? MESSAGES.books.updateFailed : MESSAGES.books.addFailed)
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditMode ? "update" : "add"} book. Please try again.`
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const idPrefix = isEditMode ? "edit-book" : "add-book"
  const isFormDisabled = isSubmitting || (isEditMode && isLoadingDetail)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Book" : "Add New Book"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the book details below."
              : "Fill in the details below to add a new book to the catalog."}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && isLoadingDetail ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading book details...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-title`}>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${idPrefix}-title`}
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g. The Great Gatsby"
                disabled={isFormDisabled}
                error={errors.title ?? undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-author`}>
                Author <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${idPrefix}-author`}
                value={form.author}
                onChange={(e) => updateField("author", e.target.value)}
                placeholder="e.g. F. Scott Fitzgerald"
                disabled={isFormDisabled}
                error={errors.author ?? undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-isbn`}>ISBN</Label>
              <Input
                id={`${idPrefix}-isbn`}
                value={form.isbn}
                onChange={(e) => updateField("isbn", e.target.value)}
                placeholder="e.g. 978-0-7432-7356-5"
                disabled={isFormDisabled}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-year`}>Publication Year</Label>
                <Input
                  id={`${idPrefix}-year`}
                  type="number"
                  value={form.publicationYear}
                  onChange={(e) => updateField("publicationYear", e.target.value)}
                  placeholder="e.g. 1925"
                  disabled={isFormDisabled}
                  error={errors.publicationYear ?? undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-genre`}>Genre</Label>
                <Input
                  id={`${idPrefix}-genre`}
                  value={form.genre}
                  onChange={(e) => updateField("genre", e.target.value)}
                  placeholder="e.g. Fiction"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-description`}>Description</Label>
              <Textarea
                id={`${idPrefix}-description`}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description of the book..."
                rows={3}
                disabled={isFormDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-cover`}>Cover Image URL</Label>
              <Input
                id={`${idPrefix}-cover`}
                value={form.coverImageUrl}
                onChange={(e) => updateField("coverImageUrl", e.target.value)}
                placeholder="https://..."
                disabled={isFormDisabled}
                error={errors.coverImageUrl ?? undefined}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isFormDisabled}>
                {isSubmitting
                  ? isEditMode
                    ? "Saving..."
                    : "Adding..."
                  : isEditMode
                    ? "Save Changes"
                    : "Add Book"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { BookFormModal }
