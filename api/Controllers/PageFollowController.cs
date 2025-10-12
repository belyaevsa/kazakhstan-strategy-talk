using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Models;
using System.Security.Claims;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/pages")]
public class PageFollowController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<PageFollowController> _logger;

    public PageFollowController(AppDbContext context, ILogger<PageFollowController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    /// <summary>
    /// Follow a page to receive notifications
    /// </summary>
    [HttpPost("{pageId}/follow")]
    [Authorize]
    public async Task<IActionResult> FollowPage(Guid pageId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        // Check if page exists
        var page = await _context.Pages.FindAsync(pageId);
        if (page == null)
        {
            return NotFound(new { message = "Page not found" });
        }

        // Check if already following
        var existingFollow = await _context.PageFollows
            .FirstOrDefaultAsync(pf => pf.UserId == userId.Value && pf.PageId == pageId);

        if (existingFollow != null)
        {
            return BadRequest(new { message = "Already following this page" });
        }

        // Create follow
        var pageFollow = new PageFollow
        {
            UserId = userId.Value,
            PageId = pageId
        };

        _context.PageFollows.Add(pageFollow);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} followed page {PageId}", userId, pageId);

        return Ok(new { message = "Page followed successfully", followId = pageFollow.Id });
    }

    /// <summary>
    /// Unfollow a page
    /// </summary>
    [HttpDelete("{pageId}/follow")]
    [Authorize]
    public async Task<IActionResult> UnfollowPage(Guid pageId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var follow = await _context.PageFollows
            .FirstOrDefaultAsync(pf => pf.UserId == userId.Value && pf.PageId == pageId);

        if (follow == null)
        {
            return NotFound(new { message = "Not following this page" });
        }

        _context.PageFollows.Remove(follow);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} unfollowed page {PageId}", userId, pageId);

        return Ok(new { message = "Page unfollowed successfully" });
    }

    /// <summary>
    /// Check if current user is following a page
    /// </summary>
    [HttpGet("{pageId}/following-status")]
    [Authorize]
    public async Task<IActionResult> GetFollowingStatus(Guid pageId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var isFollowing = await _context.PageFollows
            .AnyAsync(pf => pf.UserId == userId.Value && pf.PageId == pageId);

        return Ok(new { isFollowing, pageId });
    }

    /// <summary>
    /// Get all pages the current user is following
    /// </summary>
    [HttpGet("followed")]
    [Authorize]
    public async Task<IActionResult> GetFollowedPages()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var followedPages = await _context.PageFollows
            .Where(pf => pf.UserId == userId.Value)
            .Include(pf => pf.Page)
                .ThenInclude(p => p!.Chapter)
            .OrderByDescending(pf => pf.FollowedAt)
            .Select(pf => new
            {
                followId = pf.Id,
                followedAt = pf.FollowedAt,
                page = new
                {
                    id = pf.Page!.Id,
                    title = pf.Page.Title,
                    slug = pf.Page.Slug,
                    description = pf.Page.Description,
                    chapterId = pf.Page.ChapterId,
                    chapterTitle = pf.Page.Chapter!.Title,
                    chapterSlug = pf.Page.Chapter.Slug
                }
            })
            .ToListAsync();

        return Ok(new {
            pages = followedPages,
            total = followedPages.Count
        });
    }

    /// <summary>
    /// Get follower count for a page (public)
    /// </summary>
    [HttpGet("{pageId}/followers/count")]
    public async Task<IActionResult> GetFollowerCount(Guid pageId)
    {
        var count = await _context.PageFollows
            .CountAsync(pf => pf.PageId == pageId);

        return Ok(new { pageId, followerCount = count });
    }

    /// <summary>
    /// Get followers for a page (admin only)
    /// </summary>
    [HttpGet("{pageId}/followers")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> GetPageFollowers(Guid pageId)
    {
        var followers = await _context.PageFollows
            .Where(pf => pf.PageId == pageId)
            .Include(pf => pf.User)
            .OrderByDescending(pf => pf.FollowedAt)
            .Select(pf => new
            {
                userId = pf.UserId,
                username = pf.User!.Username,
                email = pf.User.Email,
                followedAt = pf.FollowedAt
            })
            .ToListAsync();

        return Ok(new {
            pageId,
            followers,
            total = followers.Count
        });
    }
}
