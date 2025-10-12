using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Models;
using System.Text.Json;

namespace KazakhstanStrategyApi.Services;

public interface INotificationService
{
    Task CreateCommentNotificationAsync(Comment comment);
    Task CreatePageUpdateNotificationAsync(Guid pageId, Guid updatedByUserId);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext context, ILogger<NotificationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Create notifications when a new comment is posted
    /// </summary>
    public async Task CreateCommentNotificationAsync(Comment comment)
    {
        var notifications = new List<Notification>();

        // Load comment with related data
        var commentWithData = await _context.Comments
            .Include(c => c.User)
            .Include(c => c.Page)
                .ThenInclude(p => p!.Chapter)
            .Include(c => c.Parent)
                .ThenInclude(p => p!.User)
            .FirstOrDefaultAsync(c => c.Id == comment.Id);

        if (commentWithData == null)
        {
            _logger.LogWarning("Comment {CommentId} not found for notification creation", comment.Id);
            return;
        }

        var commenterName = commentWithData.User?.Username ?? "Someone";
        var pageName = commentWithData.Page?.Title ?? "a page";
        var commentPreview = TruncateText(commentWithData.Content, 100);

        // 1. Notify parent comment author if this is a reply
        if (commentWithData.ParentId.HasValue && commentWithData.Parent != null)
        {
            var parentAuthorId = commentWithData.Parent.UserId;

            // Don't notify if replying to yourself
            if (parentAuthorId != commentWithData.UserId)
            {
                // Check if parent author wants reply notifications
                var parentSettings = await GetNotificationSettings(parentAuthorId);
                if (parentSettings.NotifyOnCommentReply)
                {
                    var parameters = new
                    {
                        username = commenterName,
                        pageName = pageName,
                        preview = commentPreview
                    };

                    notifications.Add(new Notification
                    {
                        UserId = parentAuthorId,
                        Type = "CommentReply",
                        Title = "New reply to your comment",  // Fallback for backward compatibility
                        Message = $"{commenterName} replied to your comment on '{pageName}': {commentPreview}",
                        TitleKey = "notification.commentReply.title",
                        MessageKey = "notification.commentReply.message",
                        Parameters = JsonSerializer.Serialize(parameters),
                        PageId = commentWithData.PageId,
                        CommentId = commentWithData.Id,
                        RelatedUserId = commentWithData.UserId
                    });

                    _logger.LogInformation("Created reply notification for user {UserId}", parentAuthorId);
                }
            }
        }

        // 2. Notify page followers
        if (commentWithData.PageId.HasValue)
        {
            var followers = await _context.PageFollows
                .Where(pf => pf.PageId == commentWithData.PageId.Value)
                .Select(pf => pf.UserId)
                .ToListAsync();

            foreach (var followerId in followers)
            {
                // Don't notify the comment author
                if (followerId == commentWithData.UserId)
                {
                    continue;
                }

                // Don't notify if already created a reply notification
                if (commentWithData.ParentId.HasValue && followerId == commentWithData.Parent?.UserId)
                {
                    continue;
                }

                // Check if follower wants page comment notifications
                var followerSettings = await GetNotificationSettings(followerId);
                if (followerSettings.NotifyOnFollowedPageComment)
                {
                    var parameters = new
                    {
                        username = commenterName,
                        pageName = pageName,
                        preview = commentPreview
                    };

                    notifications.Add(new Notification
                    {
                        UserId = followerId,
                        Type = "NewComment",
                        Title = "New comment on followed page",  // Fallback for backward compatibility
                        Message = $"{commenterName} commented on '{pageName}': {commentPreview}",
                        TitleKey = "notification.newComment.title",
                        MessageKey = "notification.newComment.message",
                        Parameters = JsonSerializer.Serialize(parameters),
                        PageId = commentWithData.PageId,
                        CommentId = commentWithData.Id,
                        RelatedUserId = commentWithData.UserId
                    });

                    _logger.LogInformation("Created page comment notification for follower {UserId}", followerId);
                }
            }
        }

        // Save all notifications
        if (notifications.Any())
        {
            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created {Count} notifications for comment {CommentId}", notifications.Count, comment.Id);
        }
    }

    /// <summary>
    /// Create notifications when a page is updated
    /// </summary>
    public async Task CreatePageUpdateNotificationAsync(Guid pageId, Guid updatedByUserId)
    {
        var notifications = new List<Notification>();

        // Load page data
        var page = await _context.Pages
            .Include(p => p.Chapter)
            .FirstOrDefaultAsync(p => p.Id == pageId);

        if (page == null)
        {
            _logger.LogWarning("Page {PageId} not found for notification creation", pageId);
            return;
        }

        // Get the user who updated the page
        var updater = await _context.Profiles.FindAsync(updatedByUserId);
        var updaterName = updater?.Username ?? "Someone";
        var pageName = page.Title;

        // Get all followers of this page
        var followers = await _context.PageFollows
            .Where(pf => pf.PageId == pageId)
            .Select(pf => pf.UserId)
            .ToListAsync();

        foreach (var followerId in followers)
        {
            // Don't notify the person who made the update
            if (followerId == updatedByUserId)
            {
                continue;
            }

            // Check if follower wants page update notifications
            var followerSettings = await GetNotificationSettings(followerId);
            if (followerSettings.NotifyOnFollowedPageUpdate)
            {
                var parameters = new
                {
                    username = updaterName,
                    pageName = pageName
                };

                notifications.Add(new Notification
                {
                    UserId = followerId,
                    Type = "PageUpdate",
                    Title = "Page updated",  // Fallback for backward compatibility
                    Message = $"{updaterName} updated the page '{pageName}'",
                    TitleKey = "notification.pageUpdate.title",
                    MessageKey = "notification.pageUpdate.message",
                    Parameters = JsonSerializer.Serialize(parameters),
                    PageId = pageId,
                    RelatedUserId = updatedByUserId
                });

                _logger.LogInformation("Created page update notification for follower {UserId}", followerId);
            }
        }

        // Save all notifications
        if (notifications.Any())
        {
            _context.Notifications.AddRange(notifications);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created {Count} notifications for page update {PageId}", notifications.Count, pageId);
        }
    }

    /// <summary>
    /// Get notification settings for a user, or create default if none exist
    /// </summary>
    private async Task<NotificationSettings> GetNotificationSettings(Guid userId)
    {
        var settings = await _context.NotificationSettings
            .FirstOrDefaultAsync(ns => ns.UserId == userId);

        if (settings == null)
        {
            // Create default settings
            settings = new NotificationSettings
            {
                UserId = userId,
                NotifyOnCommentReply = true,
                NotifyOnFollowedPageComment = true,
                NotifyOnFollowedPageUpdate = true,
                EmailFrequency = "none"
            };

            _context.NotificationSettings.Add(settings);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created default notification settings for user {UserId}", userId);
        }

        return settings;
    }

    /// <summary>
    /// Truncate text to specified length with ellipsis
    /// </summary>
    private string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
        {
            return text;
        }

        return text.Substring(0, maxLength) + "...";
    }
}
