import { useState, type FormEvent } from "react"
import { createBook, type CreateBookRequest } from "@/api/books"
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

interface AddBookModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBookAdded: () => void
}

interface FormState {
  title: string
  author: string
  isbn: string
  publicationYear: string
  genre: string
  description: string
  coverImageUrl: string
  totalCopies: string
}

const INITIAL_FORM_STATE: Readonly<FormState> = {
  title: "",
  author: "",
  isbn: "",
  publicationYear: "",
  genre: "",
  description: "",
  coverImageUrl: "",
  totalCopies: "1",
}

function AddBookModal({ open, onOpenChange, onBookAdded }: AddBookModalProps) {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM_STATE })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function updateField(field: keyof FormState, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm(): void {
    setForm({ ...INITIAL_FORM_STATE })
    setErrorMessage(null)
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

    const trimmedTitle = form.title.trim()
    const trimmedAuthor = form.author.trim()

    if (!trimmedTitle || !trimmedAuthor) {
      setErrorMessage("Title and Author are required.")
      return
    }

    const totalCopies = Number(form.totalCopies)
    if (!Number.isInteger(totalCopies) || totalCopies < 1) {
      setErrorMessage("Total Copies must be a positive whole number.")
      return
    }

    const parsedYear = form.publicationYear.trim()
      ? Number(form.publicationYear)
      : undefined
    if (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 0)) {
      setErrorMessage("Publication Year must be a valid year.")
      return
    }

    const payload: CreateBookRequest = {
      title: trimmedTitle,
      author: trimmedAuthor,
      totalCopies,
      ...(form.isbn.trim() && { isbn: form.isbn.trim() }),
      ...(parsedYear !== undefined && { publicationYear: parsedYear }),
      ...(form.genre.trim() && { genre: form.genre.trim() }),
      ...(form.description.trim() && { description: form.description.trim() }),
      ...(form.coverImageUrl.trim() && { coverImageUrl: form.coverImageUrl.trim() }),
    }

    setIsSubmitting(true)
    try {
      await createBook(payload)
      onBookAdded()
      handleOpenChange(false)
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to add book. Please try again."
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new book to the catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="add-book-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-book-title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. The Great Gatsby"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-book-author">
              Author <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-book-author"
              value={form.author}
              onChange={(e) => updateField("author", e.target.value)}
              placeholder="e.g. F. Scott Fitzgerald"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-book-isbn">ISBN</Label>
            <Input
              id="add-book-isbn"
              value={form.isbn}
              onChange={(e) => updateField("isbn", e.target.value)}
              placeholder="e.g. 978-0-7432-7356-5"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-book-year">Publication Year</Label>
              <Input
                id="add-book-year"
                type="number"
                value={form.publicationYear}
                onChange={(e) => updateField("publicationYear", e.target.value)}
                placeholder="e.g. 1925"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-book-genre">Genre</Label>
              <Input
                id="add-book-genre"
                value={form.genre}
                onChange={(e) => updateField("genre", e.target.value)}
                placeholder="e.g. Fiction"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-book-description">Description</Label>
            <Textarea
              id="add-book-description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief description of the book..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-book-cover">Cover Image URL</Label>
            <Input
              id="add-book-cover"
              value={form.coverImageUrl}
              onChange={(e) => updateField("coverImageUrl", e.target.value)}
              placeholder="https://..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-book-copies">
              Total Copies <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-book-copies"
              type="number"
              min={1}
              value={form.totalCopies}
              onChange={(e) => updateField("totalCopies", e.target.value)}
              required
              disabled={isSubmitting}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { AddBookModal }
