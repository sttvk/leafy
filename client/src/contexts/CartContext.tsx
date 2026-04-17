import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { BookListDto } from "@/api/books"

const MAX_CART_ITEMS = 3

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

function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<readonly BookListDto[]>(() => {
    const saved = localStorage.getItem("lms_cart")
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem("lms_cart", JSON.stringify(items))
  }, [items])

  const addToCart = useCallback((book: BookListDto) => {
    setItems((prev) => {
      if (prev.length >= MAX_CART_ITEMS) return prev
      if (prev.some((item) => item.id === book.id)) return prev
      return [...prev, book]
    })
  }, [])

  const removeFromCart = useCallback((bookId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== bookId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem("lms_cart")
  }, [])

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

export { CartProvider, useCart, MAX_CART_ITEMS }
