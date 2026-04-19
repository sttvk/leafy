using Lms.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lms.Api.Controllers;

[ApiController]
[Route("api/health")]
[AllowAnonymous]
public sealed class HealthController : ControllerBase
{
    private readonly LmsDbContext _db;
    private readonly ILogger<HealthController> _logger;

    public HealthController(LmsDbContext db, ILogger<HealthController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        try
        {
            await _db.Books.AsNoTracking().Take(1).AnyAsync(ct);
            return Ok(new { status = "healthy" });
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "heartbeat db probe failed");
            return StatusCode(503, new { status = "degraded" });
        }
    }
}
