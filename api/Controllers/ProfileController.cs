using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;
using System.Security.Claims;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(AppDbContext context, ILogger<ProfileController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<PublicProfileDTO>> GetProfile(Guid userId)
    {
        var currentUserId = GetCurrentUserId();
        var isOwner = currentUserId == userId;

        var user = await _context.Profiles.FindAsync(userId);

        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        // Calculate total comments
        var totalComments = await _context.Comments
            .Where(c => c.UserId == userId && !c.IsDeleted)
            .CountAsync();

        // Calculate total votes received
        var totalVotesReceived = await _context.CommentVotes
            .Where(cv => cv.Comment.UserId == userId)
            .CountAsync();

        var profile = new PublicProfileDTO
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Bio = user.Bio,
            AvatarUrl = user.AvatarUrl,
            Email = (isOwner || user.ShowEmail) ? user.Email : null,
            CreatedAt = user.CreatedAt,
            LastSeenAt = user.LastSeenAt,
            TotalComments = totalComments,
            TotalVotesReceived = totalVotesReceived,
            // Include settings only if owner
            ShowEmail = isOwner ? user.ShowEmail : null,
            EmailNotifications = isOwner ? user.EmailNotifications : null,
            TimeZone = isOwner ? user.TimeZone : null
        };

        return Ok(profile);
    }

    [HttpGet("{userId}/stats")]
    public async Task<ActionResult<ProfileStatsDTO>> GetProfileStats(Guid userId)
    {
        var user = await _context.Profiles.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        // Get latest comments (last 10)
        var latestCommentsQuery = await _context.Comments
            .Where(c => c.UserId == userId && !c.IsDeleted && c.PageId != null)
            .Include(c => c.Page)
                .ThenInclude(p => p.Chapter)
            .OrderByDescending(c => c.CreatedAt)
            .Take(10)
            .ToListAsync();

        var latestComments = new List<CommentWithContextDTO>();
        foreach (var c in latestCommentsQuery)
        {
            var agreeCount = await _context.CommentVotes
                .Where(cv => cv.CommentId == c.Id && cv.VoteType == "agree")
                .CountAsync();
            var disagreeCount = await _context.CommentVotes
                .Where(cv => cv.CommentId == c.Id && cv.VoteType == "disagree")
                .CountAsync();
            var voteScore = agreeCount - disagreeCount;

            latestComments.Add(new CommentWithContextDTO
            {
                Id = c.Id,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                VoteScore = voteScore,
                PageId = c.PageId!.Value,
                PageTitle = c.Page?.Title ?? "",
                PageSlug = c.Page?.Slug ?? "",
                ChapterSlug = c.Page?.Chapter?.Slug ?? "",
                ParagraphId = c.ParagraphId
            });
        }

        // Get most popular comment (highest vote score)
        var allComments = await _context.Comments
            .Where(c => c.UserId == userId && !c.IsDeleted && c.PageId != null)
            .Include(c => c.Page)
                .ThenInclude(p => p.Chapter)
            .ToListAsync();

        CommentWithContextDTO? popularComment = null;
        if (allComments.Any())
        {
            int maxScore = int.MinValue;
            Comment? mostPopular = null;

            foreach (var c in allComments)
            {
                var agreeCount = await _context.CommentVotes
                    .Where(cv => cv.CommentId == c.Id && cv.VoteType == "agree")
                    .CountAsync();
                var disagreeCount = await _context.CommentVotes
                    .Where(cv => cv.CommentId == c.Id && cv.VoteType == "disagree")
                    .CountAsync();
                var voteScore = agreeCount - disagreeCount;

                if (voteScore > maxScore)
                {
                    maxScore = voteScore;
                    mostPopular = c;
                }
            }

            if (mostPopular != null && maxScore > 0)
            {
                popularComment = new CommentWithContextDTO
                {
                    Id = mostPopular.Id,
                    Content = mostPopular.Content,
                    CreatedAt = mostPopular.CreatedAt,
                    VoteScore = maxScore,
                    PageId = mostPopular.PageId!.Value,
                    PageTitle = mostPopular.Page?.Title ?? "",
                    PageSlug = mostPopular.Page?.Slug ?? "",
                    ChapterSlug = mostPopular.Page?.Chapter?.Slug ?? "",
                    ParagraphId = mostPopular.ParagraphId
                };
            }
        }

        // Get active discussions (pages where user has commented recently)
        var activeDiscussions = await _context.Comments
            .Where(c => c.UserId == userId && !c.IsDeleted && c.PageId != null)
            .GroupBy(c => c.PageId)
            .Select(g => new
            {
                PageId = g.Key!.Value,
                CommentCount = g.Count(),
                LastCommentAt = g.Max(c => c.CreatedAt)
            })
            .OrderByDescending(x => x.LastCommentAt)
            .Take(5)
            .ToListAsync();

        var discussions = new List<ActiveDiscussionDTO>();
        foreach (var disc in activeDiscussions)
        {
            var page = await _context.Pages.Include(p => p.Chapter).FirstOrDefaultAsync(p => p.Id == disc.PageId);
            if (page != null)
            {
                discussions.Add(new ActiveDiscussionDTO
                {
                    PageId = disc.PageId,
                    PageTitle = page.Title,
                    PageSlug = page.Slug,
                    ChapterSlug = page.Chapter?.Slug ?? "",
                    CommentCount = disc.CommentCount,
                    LastCommentAt = disc.LastCommentAt
                });
            }
        }

        var stats = new ProfileStatsDTO
        {
            LatestComments = latestComments,
            MostPopularComment = popularComment,
            ActiveDiscussions = discussions
        };

        return Ok(stats);
    }

    [HttpPut("{userId}")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(Guid userId, UpdateProfileRequest request)
    {
        var currentUserId = GetCurrentUserId();

        _logger.LogInformation("Profile update attempt. UserId: {UserId}, CurrentUserId: {CurrentUserId}",
            userId, currentUserId);

        if (currentUserId == null || currentUserId != userId)
        {
            _logger.LogWarning("Profile update failed - Unauthorized. UserId: {UserId}, CurrentUserId: {CurrentUserId}",
                userId, currentUserId);
            return Forbid();
        }

        var user = await _context.Profiles.FindAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("Profile update failed - User not found. UserId: {UserId}", userId);
            return NotFound(new { message = "User not found" });
        }

        // Track changes for debug logging
        var changes = new List<string>();

        // Update fields if provided
        if (request.DisplayName != null && user.DisplayName != request.DisplayName)
        {
            changes.Add($"DisplayName: '{user.DisplayName}' -> '{request.DisplayName}'");
            user.DisplayName = request.DisplayName;
        }

        if (request.Bio != null && user.Bio != request.Bio)
        {
            changes.Add($"Bio: '{user.Bio}' -> '{request.Bio}'");
            user.Bio = request.Bio;
        }

        if (request.ShowEmail.HasValue && user.ShowEmail != request.ShowEmail.Value)
        {
            changes.Add($"ShowEmail: {user.ShowEmail} -> {request.ShowEmail.Value}");
            user.ShowEmail = request.ShowEmail.Value;
        }

        if (request.EmailNotifications.HasValue && user.EmailNotifications != request.EmailNotifications.Value)
        {
            changes.Add($"EmailNotifications: {user.EmailNotifications} -> {request.EmailNotifications.Value}");
            user.EmailNotifications = request.EmailNotifications.Value;
        }

        if (request.TimeZone != null && user.TimeZone != request.TimeZone)
        {
            changes.Add($"TimeZone: '{user.TimeZone}' -> '{request.TimeZone}'");
            user.TimeZone = request.TimeZone;
        }

        if (changes.Any())
        {
            _logger.LogDebug("Profile changes for UserId {UserId}: {Changes}",
                userId, string.Join(", ", changes));

            await _context.SaveChangesAsync();

            _logger.LogInformation("Profile updated successfully. UserId: {UserId}, ChangedFields: {FieldCount}",
                userId, changes.Count);
        }
        else
        {
            _logger.LogDebug("Profile update - No changes detected. UserId: {UserId}", userId);
        }

        return NoContent();
    }
}
