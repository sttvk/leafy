namespace Lms.Application.Checkouts;

public sealed record CheckoutResult
{
    public bool IsSuccess { get; }
    public CheckoutDto? Checkout { get; }
    public string? Error { get; }
    public CheckoutFailureReason? FailureReason { get; }

    private CheckoutResult(bool isSuccess, CheckoutDto? checkout, string? error, CheckoutFailureReason? failureReason)
    {
        IsSuccess = isSuccess;
        Checkout = checkout;
        Error = error;
        FailureReason = failureReason;
    }

    public static CheckoutResult Success(CheckoutDto checkout) =>
        new(true, checkout, null, null);

    public static CheckoutResult Failure(string error, CheckoutFailureReason reason) =>
        new(false, null, error, reason);
}

public enum CheckoutFailureReason
{
    BookUnavailable,
    LimitReached,
    NotFound
}
