namespace Lms.Application.Auth;

public sealed record RegisterRequest(
    string Email,
    string Password,
    string DisplayName);

public sealed record LoginRequest(
    string Email,
    string Password);

public sealed record GoogleLoginRequest(
    string IdToken);

public sealed record AuthResponse(
    string Token,
    string Email,
    string DisplayName,
    string Role);

public sealed record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    int EarlyReturns);
