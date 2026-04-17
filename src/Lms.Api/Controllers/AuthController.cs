using System.Security.Claims;
using Lms.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lms.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);

        if (result.IsConflict)
        {
            return Conflict(result.Error!);
        }

        if (!result.IsSuccess)
        {
            ModelState.AddModelError("registration", result.Error!);
            return ValidationProblem(ModelState);
        }

        return Created("/api/auth/me", result.Response!);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);

        if (!result.IsSuccess)
        {
            ModelState.AddModelError("login", result.Error!);
            return ValidationProblem(ModelState);
        }

        return Ok(result.Response!);
    }

    [HttpPost("google")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(GoogleLoginRequest request)
    {
        var result = await _authService.GoogleLoginAsync(request);

        if (!result.IsSuccess)
        {
            ModelState.AddModelError("google", result.Error!);
            return ValidationProblem(ModelState);
        }

        return Ok(result.Response!);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var profile = await _authService.GetProfileAsync(userId);
        if (profile is null)
        {
            return Unauthorized();
        }

        return Ok(profile);
    }
}
