using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;
using KazakhstanStrategyApi.Services;
using System.Security.Claims;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICacheService _cache;
    private readonly ILogger<CommentsController> _logger;

    public CommentsController(AppDbContext context, ICacheService cache, ILogger<CommentsController> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    [HttpGet("page/{pageId}")]
    public async Task<ActionResult<IEnumerable<CommentDTO>>> GetCommentsByPage(Guid pageId)
    {
        var comments = await _context.Comments
            .Include(c => c.User)
            .Where(c => c.PageId == pageId && c.ParentId == null)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(await MapCommentsWithReplies(comments));
    }

    [HttpGet("paragraph/{paragraphId}")]
    public async Task<ActionResult<IEnumerable<CommentDTO>>> GetCommentsByParagraph(Guid paragraphId)
    {
        var comments = await _context.Comments
            .Include(c => c.User)
            .Where(c => c.ParagraphId == paragraphId && c.ParentId == null)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(await MapCommentsWithReplies(comments));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<CommentDTO>> CreateComment(CreateCommentRequest request)
    {
        var ipAddress = GetClientIPv4Address();
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            _logger.LogWarning("Unauthorized comment creation attempt - no user ID in token. IPAddress: {IPAddress}", ipAddress ?? "Unknown");
            return Unauthorized();
        }

        var user = await _context.Profiles
            .Include(p => p.ProfileRoles)
            .FirstOrDefaultAsync(p => p.Id == userId.Value);

        if (user == null)
        {
            _logger.LogWarning("Unauthorized comment creation attempt - user {UserId} not found. IPAddress: {IPAddress}", userId.Value, ipAddress ?? "Unknown");
            return Unauthorized();
        }

        var isEditorOrAdmin = user.ProfileRoles.Any(pr => pr.Role == UserRole.Editor || pr.Role == UserRole.Admin);

        // Check if user is frozen (only for non-editors/admins)
        if (!isEditorOrAdmin && user.FrozenUntil.HasValue && user.FrozenUntil.Value > DateTime.UtcNow)
        {
            var remainingTime = user.FrozenUntil.Value - DateTime.UtcNow;
            _logger.LogWarning("Frozen account blocked comment creation. User: {Username} (ID: {UserId}), FrozenUntil: {FrozenUntil}, RemainingSeconds: {RemainingSeconds}",
                user.Username, user.Id, user.FrozenUntil.Value, (int)remainingTime.TotalSeconds);
            return BadRequest(new {
                error = "AccountFrozen",
                message = $"Your account is frozen until {user.FrozenUntil.Value:yyyy-MM-dd HH:mm:ss} UTC",
                frozenUntil = user.FrozenUntil.Value,
                remainingSeconds = (int)remainingTime.TotalSeconds
            });
        }

        // Check throttling (only for non-editors/admins)
        if (!isEditorOrAdmin && user.LastCommentAt.HasValue)
        {
            var timeSinceLastComment = DateTime.UtcNow - user.LastCommentAt.Value;
            if (timeSinceLastComment.TotalSeconds < 30)
            {
                var waitTime = 30 - (int)timeSinceLastComment.TotalSeconds;
                _logger.LogWarning("Rate limit blocked comment creation. User: {Username} (ID: {UserId}), WaitSeconds: {WaitSeconds}, LastCommentAt: {LastCommentAt}",
                    user.Username, user.Id, waitTime, user.LastCommentAt.Value);
                return BadRequest(new {
                    error = "TooManyRequests",
                    message = $"Please wait {waitTime} seconds before posting another comment",
                    waitSeconds = waitTime
                });
            }
        }

        var comment = new Comment
        {
            Content = request.Content,
            UserId = userId.Value,
            PageId = request.PageId,
            ParagraphId = request.ParagraphId,
            ParentId = request.ParentId,
            IpAddress = ipAddress
        };

        _context.Comments.Add(comment);

        // Update last comment time (only for non-editors/admins)
        if (!isEditorOrAdmin)
        {
            user.LastCommentAt = DateTime.UtcNow;
        }

        // Update comment count if it's a paragraph comment
        if (request.ParagraphId.HasValue)
        {
            var paragraph = await _context.Paragraphs.FindAsync(request.ParagraphId.Value);
            if (paragraph != null)
            {
                paragraph.CommentCount++;
            }
        }

        await _context.SaveChangesAsync();

        // Log successful comment creation
        var location = request.ParagraphId.HasValue ? $"Paragraph {request.ParagraphId.Value}" :
                       request.PageId.HasValue ? $"Page {request.PageId.Value}" : "Unknown";
        _logger.LogInformation("Comment created. User: {Username} (ID: {UserId}), CommentId: {CommentId}, Location: {Location}, IPAddress: {IPAddress}, IsReply: {IsReply}",
            user.Username, user.Id, comment.Id, location, ipAddress ?? "Unknown", request.ParentId.HasValue);

        // Invalidate paragraph cache if this is a paragraph comment
        if (request.ParagraphId.HasValue)
        {
            var paragraph = await _context.Paragraphs.FindAsync(request.ParagraphId.Value);
            if (paragraph != null)
            {
                _cache.RemoveByPattern(CacheKeys.ParagraphsByPage(paragraph.PageId));
            }
        }

        // Check for IP-based abuse (only for non-editors/admins)
        if (!isEditorOrAdmin && !string.IsNullOrEmpty(ipAddress))
        {
            await CheckAndFreezeIPAbuse(ipAddress);
        }

        var commentDto = new CommentDTO
        {
            Id = comment.Id,
            Content = comment.Content,
            AgreeCount = comment.AgreeCount,
            DisagreeCount = comment.DisagreeCount,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
            IsDeleted = comment.IsDeleted,
            ParentId = comment.ParentId,
            User = new UserDTO
            {
                Id = user!.Id,
                Email = user.Email,
                Username = user.Username,
                AvatarUrl = user.AvatarUrl
            }
        };

        return CreatedAtAction(nameof(GetComment), new { id = comment.Id }, commentDto);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CommentDTO>> GetComment(Guid id)
    {
        var comment = await _context.Comments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null)
        {
            return NotFound();
        }

        var replies = await LoadReplies(comment.Id);

        return Ok(new CommentDTO
        {
            Id = comment.Id,
            Content = comment.Content,
            AgreeCount = comment.AgreeCount,
            DisagreeCount = comment.DisagreeCount,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
            IsDeleted = comment.IsDeleted,
            ParentId = comment.ParentId,
            User = new UserDTO
            {
                Id = comment.User.Id,
                Email = comment.User.Email,
                Username = comment.User.Username,
                AvatarUrl = comment.User.AvatarUrl
            },
            Replies = replies
        });
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateComment(Guid id, UpdateCommentRequest request)
    {
        var ipAddress = GetClientIPv4Address();
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            _logger.LogWarning("Unauthorized comment update attempt - no user ID in token. CommentId: {CommentId}, IPAddress: {IPAddress}", id, ipAddress ?? "Unknown");
            return Unauthorized();
        }

        var comment = await _context.Comments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null)
        {
            _logger.LogWarning("Comment update failed - comment not found. CommentId: {CommentId}, UserId: {UserId}, IPAddress: {IPAddress}", id, userId.Value, ipAddress ?? "Unknown");
            return NotFound();
        }

        if (comment.UserId != userId.Value)
        {
            _logger.LogWarning("Forbidden comment update attempt. CommentId: {CommentId}, CommentOwner: {CommentOwner}, Requester: {Requester}, IPAddress: {IPAddress}",
                id, comment.UserId, userId.Value, ipAddress ?? "Unknown");
            return Forbid();
        }

        var oldContent = comment.Content;
        comment.Content = request.Content;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Comment updated. CommentId: {CommentId}, User: {Username} (ID: {UserId}), OldContentLength: {OldLength}, NewContentLength: {NewLength}",
            id, comment.User.Username, userId.Value, oldContent.Length, request.Content.Length);

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var ipAddress = GetClientIPv4Address();
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            _logger.LogWarning("Unauthorized comment deletion attempt - no user ID in token. CommentId: {CommentId}, IPAddress: {IPAddress}", id, ipAddress ?? "Unknown");
            return Unauthorized();
        }

        var comment = await _context.Comments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (comment == null)
        {
            _logger.LogWarning("Comment deletion failed - comment not found. CommentId: {CommentId}, UserId: {UserId}, IPAddress: {IPAddress}", id, userId.Value, ipAddress ?? "Unknown");
            return NotFound();
        }

        // Check if user is admin or comment owner
        var isAdmin = User.IsInRole("Admin");

        if (!isAdmin && comment.UserId != userId.Value)
        {
            _logger.LogWarning("Forbidden comment deletion attempt. CommentId: {CommentId}, CommentOwner: {CommentOwner}, Requester: {Requester}, IPAddress: {IPAddress}",
                id, comment.UserId, userId.Value, ipAddress ?? "Unknown");
            return Forbid();
        }

        var deletedBy = await _context.Profiles.FindAsync(userId.Value);
        var deletionType = isAdmin && comment.UserId != userId.Value ? "Admin" : "Owner";

        // Mark as deleted instead of removing (soft delete)
        comment.IsDeleted = true;
        comment.DeletedAt = DateTime.UtcNow;
        comment.Content = "";

        // Update comment count if it's a paragraph comment
        if (comment.ParagraphId.HasValue)
        {
            var paragraph = await _context.Paragraphs.FindAsync(comment.ParagraphId.Value);
            if (paragraph != null && paragraph.CommentCount > 0)
            {
                paragraph.CommentCount--;
                // Invalidate paragraph cache
                _cache.RemoveByPattern(CacheKeys.ParagraphsByPage(paragraph.PageId));
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Comment deleted. CommentId: {CommentId}, CommentOwner: {CommentOwner}, DeletedBy: {DeletedByUsername} (ID: {DeletedById}), DeletionType: {DeletionType}",
            id, comment.User.Username, deletedBy?.Username ?? "Unknown", userId.Value, deletionType);

        return NoContent();
    }

    [HttpPost("{id}/vote")]
    [Authorize]
    public async Task<IActionResult> VoteComment(Guid id, VoteRequest request)
    {
        var ipAddress = GetClientIPv4Address();
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            _logger.LogWarning("Unauthorized vote attempt - no user ID in token. CommentId: {CommentId}, IPAddress: {IPAddress}", id, ipAddress ?? "Unknown");
            return Unauthorized();
        }

        var user = await _context.Profiles.FindAsync(userId.Value);
        var comment = await _context.Comments.FindAsync(id);
        if (comment == null)
        {
            _logger.LogWarning("Vote failed - comment not found. CommentId: {CommentId}, UserId: {UserId}, IPAddress: {IPAddress}", id, userId.Value, ipAddress ?? "Unknown");
            return NotFound();
        }

        var existingVote = await _context.CommentVotes
            .FirstOrDefaultAsync(v => v.CommentId == id && v.UserId == userId.Value);

        string action;
        if (existingVote != null)
        {
            // Update vote counts
            if (existingVote.VoteType == "agree") comment.AgreeCount--;
            else comment.DisagreeCount--;

            if (existingVote.VoteType == request.VoteType)
            {
                // Remove vote if same type
                _context.CommentVotes.Remove(existingVote);
                action = $"Removed {request.VoteType}";
                _logger.LogInformation("Vote removed. CommentId: {CommentId}, User: {Username} (ID: {UserId}), VoteType: {VoteType}",
                    id, user?.Username ?? "Unknown", userId.Value, request.VoteType);
            }
            else
            {
                // Change vote type
                var oldVoteType = existingVote.VoteType;
                existingVote.VoteType = request.VoteType;
                if (request.VoteType == "agree") comment.AgreeCount++;
                else comment.DisagreeCount++;
                action = $"Changed from {oldVoteType} to {request.VoteType}";
                _logger.LogInformation("Vote changed. CommentId: {CommentId}, User: {Username} (ID: {UserId}), OldVoteType: {OldVoteType}, NewVoteType: {NewVoteType}",
                    id, user?.Username ?? "Unknown", userId.Value, oldVoteType, request.VoteType);
            }
        }
        else
        {
            // Add new vote
            var vote = new CommentVote
            {
                CommentId = id,
                UserId = userId.Value,
                VoteType = request.VoteType
            };

            _context.CommentVotes.Add(vote);

            if (request.VoteType == "agree") comment.AgreeCount++;
            else comment.DisagreeCount++;
            action = $"Added {request.VoteType}";
            _logger.LogInformation("New vote added. CommentId: {CommentId}, User: {Username} (ID: {UserId}), VoteType: {VoteType}",
                id, user?.Username ?? "Unknown", userId.Value, request.VoteType);
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
    }

    private string? GetClientIPv4Address()
    {
        // Check X-Forwarded-For header (for proxies/load balancers)
        var forwardedFor = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            // X-Forwarded-For can contain multiple IPs, take the first one
            var ips = forwardedFor.Split(',');
            if (ips.Length > 0)
            {
                var ip = ips[0].Trim();
                // Try to parse as IPv4
                if (System.Net.IPAddress.TryParse(ip, out var parsedIp))
                {
                    if (parsedIp.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                    {
                        return ip;
                    }
                }
            }
        }

        // Fallback to RemoteIpAddress
        var remoteIp = HttpContext.Connection.RemoteIpAddress;
        if (remoteIp != null)
        {
            // Convert IPv6 loopback to IPv4
            if (remoteIp.ToString() == "::1")
            {
                return "127.0.0.1";
            }

            // If it's IPv6 mapped to IPv4, extract the IPv4 address
            if (remoteIp.IsIPv4MappedToIPv6)
            {
                return remoteIp.MapToIPv4().ToString();
            }
            // If it's IPv4, return it
            if (remoteIp.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
            {
                return remoteIp.ToString();
            }

            // For any other IPv6 address, return the string representation
            // (better to have IPv6 than nothing)
            return remoteIp.ToString();
        }

        // Return "unknown" as fallback
        return "unknown";
    }

    private async Task<List<CommentDTO>> MapCommentsWithReplies(List<Comment> comments)
    {
        var result = new List<CommentDTO>();

        foreach (var comment in comments)
        {
            var replies = await LoadReplies(comment.Id);

            result.Add(new CommentDTO
            {
                Id = comment.Id,
                Content = comment.Content,
                AgreeCount = comment.AgreeCount,
                DisagreeCount = comment.DisagreeCount,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt,
                IsDeleted = comment.IsDeleted,
                ParentId = comment.ParentId,
                User = new UserDTO
                {
                    Id = comment.User.Id,
                    Email = comment.User.Email,
                    Username = comment.User.Username,
                    AvatarUrl = comment.User.AvatarUrl
                },
                Replies = replies
            });
        }

        return result;
    }

    private async Task<List<CommentDTO>> LoadReplies(Guid commentId)
    {
        var replies = await _context.Comments
            .Include(c => c.User)
            .Where(c => c.ParentId == commentId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return await MapCommentsWithReplies(replies);
    }

    private async Task CheckAndFreezeIPAbuse(string ipAddress)
    {
        // Look for comments from this IP in the last 30 seconds
        var recentComments = await _context.Comments
            .Where(c => c.IpAddress == ipAddress && c.CreatedAt > DateTime.UtcNow.AddSeconds(-30))
            .Select(c => c.UserId)
            .Distinct()
            .ToListAsync();

        // If 3 or more different users posted from the same IP in the last 30 seconds
        if (recentComments.Count >= 3)
        {
            _logger.LogWarning("IP abuse detected. IPAddress: {IPAddress}, UniqueUsers: {UniqueUserCount}, TimeWindow: 30s",
                ipAddress, recentComments.Count);

            var usersToFreeze = await _context.Profiles
                .Include(p => p.ProfileRoles)
                    .ThenInclude(pr => pr.Role)
                .Where(p => recentComments.Contains(p.Id))
                .ToListAsync();

            var frozenUsernames = new List<string>();
            foreach (var user in usersToFreeze)
            {
                // Only freeze non-editors/admins
                var isEditorOrAdmin = user.ProfileRoles.Any(pr => pr.Role == UserRole.Editor || pr.Role == UserRole.Admin);
                if (!isEditorOrAdmin)
                {
                    user.FrozenUntil = DateTime.UtcNow.AddHours(24);
                    frozenUsernames.Add(user.Username);
                }
            }

            await _context.SaveChangesAsync();

            if (frozenUsernames.Any())
            {
                _logger.LogWarning("Users frozen due to IP abuse. IPAddress: {IPAddress}, FrozenUsers: {FrozenUsers}, FrozenUntil: {FrozenUntil}",
                    ipAddress, string.Join(", ", frozenUsernames), DateTime.UtcNow.AddHours(24));
            }
        }
    }
}
