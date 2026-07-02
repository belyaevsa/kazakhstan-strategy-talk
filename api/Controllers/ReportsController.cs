using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;
using System.Security.Claims;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(AppDbContext context, ILogger<ReportsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    /// <summary>Report a comment or suggestion. Any authenticated user; one report per item per user.</summary>
    [HttpPost]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        // Verify the reported content exists
        bool exists = request.ContentType == "Comment"
            ? await _context.Comments.AnyAsync(c => c.Id == request.ContentId && !c.IsDeleted)
            : await _context.ParagraphSuggestions.AnyAsync(s => s.Id == request.ContentId && !s.IsDeleted);

        if (!exists)
        {
            return NotFound(new { message = "The content you are trying to report no longer exists." });
        }

        // Prevent duplicate reports from the same user for the same item
        var already = await _context.ContentReports.AnyAsync(r =>
            r.ReporterProfileId == userId.Value &&
            r.ContentType == request.ContentType &&
            r.ContentId == request.ContentId);

        if (already)
        {
            return Conflict(new { message = "You have already reported this content." });
        }

        var report = new ContentReport
        {
            ContentType = request.ContentType,
            ContentId = request.ContentId,
            Reason = request.Reason,
            Details = request.Details,
            Status = "Pending",
            ReporterProfileId = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _context.ContentReports.Add(report);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Content reported. Type: {ContentType}, ContentId: {ContentId}, Reporter: {UserId}",
            request.ContentType, request.ContentId, userId.Value);

        return Ok(new { message = "Thank you. Your report has been submitted for review." });
    }

    /// <summary>List reports (admins only). Defaults to pending.</summary>
    [HttpGet]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<IActionResult> GetReports([FromQuery] string status = "Pending")
    {
        var reports = await _context.ContentReports
            .Where(r => r.Status == status)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReportDTO
            {
                Id = r.Id,
                ContentType = r.ContentType,
                ContentId = r.ContentId,
                Reason = r.Reason,
                Details = r.Details,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
                ReporterProfileId = r.ReporterProfileId,
                ReporterUsername = r.ReporterProfile.Username
            })
            .ToListAsync();

        // Attach a short preview of the reported content
        foreach (var report in reports)
        {
            report.ContentPreview = report.ContentType == "Comment"
                ? (await _context.Comments.Where(c => c.Id == report.ContentId).Select(c => c.Content).FirstOrDefaultAsync())
                : (await _context.ParagraphSuggestions.Where(s => s.Id == report.ContentId).Select(s => s.SuggestedContent).FirstOrDefaultAsync());
            if (report.ContentPreview?.Length > 280)
            {
                report.ContentPreview = report.ContentPreview.Substring(0, 280) + "…";
            }
        }

        return Ok(reports);
    }

    /// <summary>Count of pending reports (admins only) for a badge.</summary>
    [HttpGet("pending-count")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<IActionResult> GetPendingCount()
    {
        var count = await _context.ContentReports.CountAsync(r => r.Status == "Pending");
        return Ok(new { count });
    }

    /// <summary>Resolve a report as Reviewed or Dismissed (admins only).</summary>
    [HttpPost("{id}/resolve")]
    [Authorize(Policy = "AdminPolicy")]
    public async Task<IActionResult> ResolveReport(Guid id, [FromBody] ResolveReportRequest request)
    {
        var userId = GetCurrentUserId();
        var report = await _context.ContentReports.FirstOrDefaultAsync(r => r.Id == id);
        if (report == null) return NotFound();

        report.Status = request.Action;
        report.ReviewedByProfileId = userId;
        report.ReviewedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Report {ReportId} resolved as {Action} by {UserId}", id, request.Action, userId);
        return Ok(new { message = "Report resolved." });
    }
}
