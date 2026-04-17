using Google.Apis.Auth;
using Lms.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Lms.Application.Auth;

public sealed class AuthService
{
    private const string GoogleLoginProvider = "Google";
    private const string ConfigKeyGoogleClientId = "Authentication:Google:ClientId";

    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly JwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        JwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return AuthResult.Failure("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return AuthResult.Failure("Password is required.");
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return AuthResult.Failure("Display name is required.");
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            return AuthResult.Conflict("A user with this email already exists.");
        }

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName.Trim(),
            Role = UserRole.Member,
            CreatedAt = DateTime.UtcNow,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            return AuthResult.Failure(errors);
        }

        _logger.LogInformation("Registered user {UserId} via email", user.Id);

        var token = _jwtTokenGenerator.GenerateToken(user);
        return AuthResult.Success(new AuthResponse(
            token, user.Email!, user.DisplayName, user.Role.ToString()));
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return AuthResult.Failure("Email and password are required.");
        }

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return AuthResult.Failure("Invalid email or password.");
        }

        var signInResult = await _signInManager.CheckPasswordSignInAsync(
            user, request.Password, lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            return AuthResult.Failure("Invalid email or password.");
        }

        _logger.LogInformation("User {UserId} logged in via email", user.Id);

        var token = _jwtTokenGenerator.GenerateToken(user);
        return AuthResult.Success(new AuthResponse(
            token, user.Email!, user.DisplayName, user.Role.ToString()));
    }

    public async Task<AuthResult> GoogleLoginAsync(GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return AuthResult.Failure("Google ID token is required.");
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            var clientId = _configuration[ConfigKeyGoogleClientId]
                ?? throw new InvalidOperationException($"Missing {ConfigKeyGoogleClientId}");

            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId },
            };

            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
        }
        catch (InvalidJwtException)
        {
            return AuthResult.Failure("Invalid Google token.");
        }

        var email = payload.Email;
        if (string.IsNullOrWhiteSpace(email))
        {
            return AuthResult.Failure("Google account has no email.");
        }

        var user = await _userManager.FindByEmailAsync(email);

        if (user is null)
        {
            user = new User
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = payload.Name ?? email,
                Role = UserRole.Member,
                CreatedAt = DateTime.UtcNow,
            };

            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
                return AuthResult.Failure(errors);
            }

            _logger.LogInformation("Created user {UserId} via Google login", user.Id);
        }

        var logins = await _userManager.GetLoginsAsync(user);
        var hasGoogleLogin = logins.Any(l => l.LoginProvider == GoogleLoginProvider);

        if (!hasGoogleLogin)
        {
            var loginInfo = new UserLoginInfo(GoogleLoginProvider, payload.Subject, GoogleLoginProvider);
            var linkResult = await _userManager.AddLoginAsync(user, loginInfo);
            if (!linkResult.Succeeded)
            {
                _logger.LogWarning(
                    "Failed to link Google login for user {UserId}: {Errors}",
                    user.Id,
                    string.Join("; ", linkResult.Errors.Select(e => e.Description)));
            }
            else
            {
                _logger.LogInformation("Linked Google login for user {UserId}", user.Id);
            }
        }

        var token = _jwtTokenGenerator.GenerateToken(user);
        return AuthResult.Success(new AuthResponse(
            token, user.Email!, user.DisplayName, user.Role.ToString()));
    }

    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return null;
        }

        return new UserProfileDto(
            user.Id,
            user.Email ?? string.Empty,
            user.DisplayName,
            user.Role.ToString(),
            user.EarlyReturns);
    }
}

public sealed record AuthResult(
    bool IsSuccess,
    AuthResponse? Response,
    string? Error,
    bool IsConflict)
{
    public static AuthResult Success(AuthResponse response) =>
        new(true, response, null, false);

    public static AuthResult Failure(string error) =>
        new(false, null, error, false);

    public static AuthResult Conflict(string error) =>
        new(false, null, error, true);
}
