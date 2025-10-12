using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Models;
using System.Security.Claims;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(AppDbContext context, ILogger<NotificationsController> logger)
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
    /// Get user's notifications with pagination and filtering
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] string? type = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var query = _context.Notifications
            .Where(n => n.UserId == userId.Value);

        // Filter by read status
        if (unreadOnly == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        // Filter by type
        if (!string.IsNullOrEmpty(type))
        {
            query = query.Where(n => n.Type == type);
        }

        // Get total count for pagination
        var total = await query.CountAsync();
        var unreadCount = await _context.Notifications
            .CountAsync(n => n.UserId == userId.Value && !n.IsRead);

        // Get paginated results
        var notifications = await query
            .Include(n => n.Page)
                .ThenInclude(p => p!.Chapter)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(n => new
            {
                id = n.Id,
                type = n.Type,
                title = n.Title,
                message = n.Message,
                isRead = n.IsRead,
                createdAt = n.CreatedAt,
                readAt = n.ReadAt,
                page = n.Page != null ? new
                {
                    id = n.Page.Id,
                    title = n.Page.Title,
                    slug = n.Page.Slug,
                    chapterSlug = n.Page.Chapter!.Slug
                } : null,
                commentId = n.CommentId
            })
            .ToListAsync();

        return Ok(new
        {
            notifications,
            pagination = new
            {
                page,
                limit,
                total,
                totalPages = (int)Math.Ceiling((double)total / limit)
            },
            unreadCount
        });
    }

    /// <summary>
    /// Get count of unread notifications
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var count = await _context.Notifications
            .CountAsync(n => n.UserId == userId.Value && !n.IsRead);

        return Ok(new { unreadCount = count });
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId.Value);

        if (notification == null)
        {
            return NotFound(new { message = "Notification not found" });
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Notification {NotificationId} marked as read by user {UserId}", id, userId);
        }

        return Ok(new { message = "Notification marked as read" });
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    [HttpPut("mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == userId.Value && !n.IsRead)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} marked {Count} notifications as read", userId, unreadNotifications.Count);

        return Ok(new
        {
            message = "All notifications marked as read",
            count = unreadNotifications.Count
        });
    }

    /// <summary>
    /// Delete a notification
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId.Value);

        if (notification == null)
        {
            return NotFound(new { message = "Notification not found" });
        }

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Notification {NotificationId} deleted by user {UserId}", id, userId);

        return Ok(new { message = "Notification deleted" });
    }

    /// <summary>
    /// Delete all read notifications
    /// </summary>
    [HttpDelete("clear-read")]
    public async Task<IActionResult> ClearReadNotifications()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var readNotifications = await _context.Notifications
            .Where(n => n.UserId == userId.Value && n.IsRead)
            .ToListAsync();

        _context.Notifications.RemoveRange(readNotifications);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} cleared {Count} read notifications", userId, readNotifications.Count);

        return Ok(new
        {
            message = "Read notifications cleared",
            count = readNotifications.Count
        });
    }

    /// <summary>
    /// Get notification settings for current user
    /// </summary>
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var settings = await _context.NotificationSettings
            .FirstOrDefaultAsync(ns => ns.UserId == userId.Value);

        // Create default settings if none exist
        if (settings == null)
        {
            settings = new NotificationSettings
            {
                UserId = userId.Value
            };
            _context.NotificationSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            emailFrequency = settings.EmailFrequency,
            notifyOnCommentReply = settings.NotifyOnCommentReply,
            notifyOnFollowedPageComment = settings.NotifyOnFollowedPageComment,
            notifyOnFollowedPageUpdate = settings.NotifyOnFollowedPageUpdate
        });
    }

    /// <summary>
    /// Update notification settings
    /// </summary>
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateNotificationSettingsRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { message = "User not authenticated" });
        }

        var settings = await _context.NotificationSettings
            .FirstOrDefaultAsync(ns => ns.UserId == userId.Value);

        // Create if doesn't exist
        if (settings == null)
        {
            settings = new NotificationSettings
            {
                UserId = userId.Value
            };
            _context.NotificationSettings.Add(settings);
        }

        // Validate email frequency
        var validFrequencies = new[] { "immediate", "hourly", "daily", "none" };
        if (!string.IsNullOrEmpty(request.EmailFrequency) && !validFrequencies.Contains(request.EmailFrequency))
        {
            return BadRequest(new { message = "Invalid email frequency. Must be: immediate, hourly, daily, or none" });
        }

        // Update settings
        if (!string.IsNullOrEmpty(request.EmailFrequency))
        {
            settings.EmailFrequency = request.EmailFrequency;
        }

        if (request.NotifyOnCommentReply.HasValue)
        {
            settings.NotifyOnCommentReply = request.NotifyOnCommentReply.Value;
        }

        if (request.NotifyOnFollowedPageComment.HasValue)
        {
            settings.NotifyOnFollowedPageComment = request.NotifyOnFollowedPageComment.Value;
        }

        if (request.NotifyOnFollowedPageUpdate.HasValue)
        {
            settings.NotifyOnFollowedPageUpdate = request.NotifyOnFollowedPageUpdate.Value;
        }

        settings.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} updated notification settings", userId);

        return Ok(new { message = "Settings updated successfully" });
    }
}

public class UpdateNotificationSettingsRequest
{
    public string? EmailFrequency { get; set; }
    public bool? NotifyOnCommentReply { get; set; }
    public bool? NotifyOnFollowedPageComment { get; set; }
    public bool? NotifyOnFollowedPageUpdate { get; set; }
}
