import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { BookListDto } from "@/api/books"
import { useAuth } from "@/contexts/AuthContext"

const CART_KEY_PREFIX = "lms_cart_"

interface CartContextValue {
  items: readonly BookListDto[]
  addToCart: (book: BookListDto) => void
  removeFromCart: (bookId: string) => void
  clearCart: () => void
  isInCart: (bookId: string) => boolean
  itemCount: number
}

const CartContext = createContext<CartContextValue | null>(null)

function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (ctx == null) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}

interface CartProviderProps {
  children: ReactNode
}

function loadCart(userId: string | undefined): readonly BookListDto[] {
  if (!userId) return []
  const key = `${CART_KEY_PREFIX}${userId}`
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : []
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

function CartProvider({ children }: CartProviderProps) {
  const { user } = useAuth()
  const userId = user?.id

  const [items, setItems] = useState<readonly BookListDto[]>(() => loadCart(userId))

  useEffect(() => {
    setItems(loadCart(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    localStorage.setItem(`${CART_KEY_PREFIX}${userId}`, JSON.stringify(items))
  }, [items, userId])

  const addToCart = useCallback((book: BookListDto) => {
    if (!userId) return
    setItems((prev) => {
      if (prev.some((item) => item.id === book.id)) return prev
      return [...prev, book]
    })
  }, [userId])

  const removeFromCart = useCallback((bookId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== bookId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    if (userId) {
      localStorage.removeItem(`${CART_KEY_PREFIX}${userId}`)
    }
  }, [userId])

  const isInCart = useCallback(
    (bookId: string): boolean => items.some((item) => item.id === bookId),
    [items]
  )

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addToCart,
      removeFromCart,
      clearCart,
      isInCart,
      itemCount: items.length,
    }),
    [items, addToCart, removeFromCart, clearCart, isInCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export { CartProvider, useCart }
