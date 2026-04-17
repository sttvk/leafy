export const MESSAGES = {
  validation: {
    required: (field: string) => `${field} is required`,
    email: "Please enter a valid email address",
    passwordMin: "Password must be at least 8 characters",
    passwordUppercase: "Password must include an uppercase letter",
    passwordLowercase: "Password must include a lowercase letter",
    passwordDigit: "Password must include a number",
    nameMin: "Name must be at least 2 characters",
    yearInvalid: "Please enter a valid year",
    urlInvalid: "Please enter a valid URL starting with http:// or https://",
  },

  auth: {
    loginSuccess: "Welcome back!",
    loginFailed: "Incorrect email or password. Please try again.",
    registerSuccess: "Account created! Welcome to Leafy.",
    registerFailed: "Could not create your account. Please try again.",
    googleFailed: "Google sign-in did not complete. Please try again.",
    logoutSuccess: "You have been logged out.",
  },

  books: {
    addSuccess: "Book added to the library.",
    addFailed: "Could not add the book. Please try again.",
    updateSuccess: "Book details updated.",
    updateFailed: "Could not update the book. Please try again.",
    deleteSuccess: "Book removed from the library.",
    deleteFailed: "Could not delete the book. Please try again.",
    deleteConfirm: "Are you sure you want to delete this book? This cannot be undone.",
  },

  checkout: {
    checkoutFailed: "Could not start checkout. Please try again.",
    paymentSuccess: "Payment successful! Your books are ready to read.",
    paymentFailed: "Payment verification failed. Please contact support.",
    alreadyReading: "Already Reading",
    addedToCart: "Added to Cart \u00b7 $1.99/14 days",
    addToCart: "Add to Cart \u00b7 $1.99/14 days",
    loginToRead: "Login to read this book",
  },

  returns: {
    success: "Book returned successfully! Early returns earn credits toward a free rental.",
    failed: "Could not return the book. Please try again.",
    confirmReturn: "Are you sure you want to return this book? You will lose access to it.",
  },
} as const

export const CONSTANTS = {
  rentalPricePerBook: 1.99,
  rentalDays: 14,
  earlyReturnDays: 7,
  freeRentalThreshold: 5,
} as const
