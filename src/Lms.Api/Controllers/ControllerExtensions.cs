using System.Security.Claims;

namespace Lms.Api.Controllers;

internal static class ControllerExtensions
{
    internal static Guid? ExtractUserId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return claim is not null && Guid.TryParse(claim, out var id) ? id : null;
    }
}
