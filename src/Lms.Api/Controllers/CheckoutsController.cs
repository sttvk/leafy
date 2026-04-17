using Lms.Application.Checkouts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lms.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class CheckoutsController : ControllerBase
{
    private readonly CheckoutService _checkoutService;

    public CheckoutsController(CheckoutService checkoutService)
    {
        _checkoutService = checkoutService;
    }

    [HttpPost("books/{id:guid}/checkout")]
    [Authorize]
    public async Task<ActionResult<CheckoutDto>> Checkout(Guid id, CancellationToken ct)
    {
        var userId = User.ExtractUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _checkoutService.CheckoutAsync(id, userId.Value, ct);

        if (!result.IsSuccess)
        {
            return Conflict(result.Error!);
        }

        return Ok(result.Checkout!);
    }

    [HttpPost("checkouts/{id:guid}/return")]
    [Authorize]
    public async Task<ActionResult<CheckoutDto>> Return(Guid id, CancellationToken ct)
    {
        var userId = User.ExtractUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _checkoutService.ReturnAsync(id, userId.Value, ct);

        if (!result.IsSuccess)
        {
            return result.FailureReason == CheckoutFailureReason.NotFound
                ? NotFound()
                : Conflict(result.Error!);
        }

        return Ok(result.Checkout!);
    }

    [HttpGet("checkouts/mine")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<CheckoutDto>>> GetMyCheckouts(CancellationToken ct)
    {
        var userId = User.ExtractUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var checkouts = await _checkoutService.GetMyCheckoutsAsync(userId.Value, ct);
        return Ok(checkouts);
    }

    [HttpGet("checkouts")]
    [Authorize(Roles = "Librarian")]
    public async Task<ActionResult<IReadOnlyList<CheckoutDto>>> GetAllActiveCheckouts(CancellationToken ct)
    {
        var checkouts = await _checkoutService.GetAllActiveCheckoutsAsync(ct);
        return Ok(checkouts);
    }
}
