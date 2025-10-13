using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KazakhstanStrategyApi.Models;
using KazakhstanStrategyApi.Services;
using System.Security.Claims;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParagraphSuggestionsController : ControllerBase
{
    private readonly SuggestionService _suggestionService;
    private readonly ILogger<ParagraphSuggestionsController> _logger;

    public ParagraphSuggestionsController(
        SuggestionService suggestionService,
        ILogger<ParagraphSuggestionsController> logger)
    {
        _suggestionService = suggestionService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found");
        }
        return userId;
    }

    private bool IsAdmin()
    {
        return User.IsInRole("admin");
    }

    private bool IsEditor()
    {
        return User.IsInRole("admin") || User.IsInRole("editor");
    }

    private string? GetClientIPv4Address()
    {
        // Check X-Forwarded-For header (for proxies/load balancers)
        var forwardedFor = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            var ips = forwardedFor.Split(',');
            if (ips.Length > 0)
            {
                var ip = ips[0].Trim();
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
            if (remoteIp.ToString() == "::1") return "127.0.0.1";
            if (remoteIp.IsIPv4MappedToIPv6) return remoteIp.MapToIPv4().ToString();
            if (remoteIp.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork) return remoteIp.ToString();
            return remoteIp.ToString();
        }

        return null;
    }

    private string? GetUserAgent()
    {
        return HttpContext.Request.Headers["User-Agent"].FirstOrDefault();
    }

    /// <summary>
    /// Create a new suggestion for a paragraph
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<object>> CreateSuggestion([FromBody] CreateSuggestionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var ipAddress = GetClientIPv4Address();
            var userAgent = GetUserAgent();

            var suggestion = await _suggestionService.CreateSuggestionAsync(
                request.ParagraphId,
                userId,
                request.SuggestedContent,
                request.Comment,
                ipAddress,
                userAgent
            );

            return Ok(new
            {
                id = suggestion.Id,
                paragraphId = suggestion.ParagraphId,
                userId = suggestion.UserId,
                suggestedContent = suggestion.SuggestedContent,
                comment = suggestion.Comment,
                status = suggestion.Status.ToString(),
                createdAt = suggestion.CreatedAt,
                updatedAt = suggestion.UpdatedAt
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating suggestion");
            return StatusCode(500, new { message = "An error occurred while creating the suggestion" });
        }
    }

    /// <summary>
    /// Get all suggestions for a paragraph
    /// </summary>
    [HttpGet("paragraph/{paragraphId}")]
    public async Task<ActionResult<object>> GetSuggestionsByParagraph(Guid paragraphId)
    {
        try
        {
            var suggestions = await _suggestionService.GetSuggestionsByParagraphAsync(paragraphId);
            var userId = User.Identity?.IsAuthenticated == true ? GetCurrentUserId() : (Guid?)null;

            var result = suggestions.Select(s => new
            {
                id = s.Id,
                paragraphId = s.ParagraphId,
                userId = s.UserId,
                user = new
                {
                    id = s.User?.Id,
                    username = s.User?.Username,
                    displayName = s.User?.DisplayName,
                    avatarUrl = s.User?.AvatarUrl
                },
                suggestedContent = s.SuggestedContent,
                comment = s.Comment,
                status = s.Status.ToString(),
                createdAt = s.CreatedAt,
                updatedAt = s.UpdatedAt,
                upvotes = s.Votes.Count(v => v.VoteType == VoteType.Upvote),
                downvotes = s.Votes.Count(v => v.VoteType == VoteType.Downvote),
                userVote = userId.HasValue
                    ? s.Votes.FirstOrDefault(v => v.UserId == userId.Value)?.VoteType.ToString()
                    : null,
                commentCount = s.Comments.Count(c => !c.IsDeleted)
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching suggestions for paragraph {ParagraphId}", paragraphId);
            return StatusCode(500, new { message = "An error occurred while fetching suggestions" });
        }
    }

    /// <summary>
    /// Get a single suggestion by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetSuggestion(Guid id)
    {
        try
        {
            var suggestion = await _suggestionService.GetSuggestionByIdAsync(id);
            if (suggestion == null)
            {
                return NotFound(new { message = "Suggestion not found" });
            }

            var userId = User.Identity?.IsAuthenticated == true ? GetCurrentUserId() : (Guid?)null;

            return Ok(new
            {
                id = suggestion.Id,
                paragraphId = suggestion.ParagraphId,
                paragraph = suggestion.Paragraph != null ? new
                {
                    id = suggestion.Paragraph.Id,
                    content = suggestion.Paragraph.Content,
                    page = suggestion.Paragraph.Page != null ? new
                    {
                        id = suggestion.Paragraph.Page.Id,
                        title = suggestion.Paragraph.Page.Title,
                        slug = suggestion.Paragraph.Page.Slug
                    } : null
                } : null,
                userId = suggestion.UserId,
                user = new
                {
                    id = suggestion.User?.Id,
                    username = suggestion.User?.Username,
                    displayName = suggestion.User?.DisplayName,
                    avatarUrl = suggestion.User?.AvatarUrl
                },
                suggestedContent = suggestion.SuggestedContent,
                comment = suggestion.Comment,
                status = suggestion.Status.ToString(),
                createdAt = suggestion.CreatedAt,
                updatedAt = suggestion.UpdatedAt,
                upvotes = suggestion.Votes.Count(v => v.VoteType == VoteType.Upvote),
                downvotes = suggestion.Votes.Count(v => v.VoteType == VoteType.Downvote),
                userVote = userId.HasValue
                    ? suggestion.Votes.FirstOrDefault(v => v.UserId == userId.Value)?.VoteType.ToString()
                    : null,
                votes = suggestion.Votes.Select(v => new
                {
                    id = v.Id,
                    userId = v.UserId,
                    username = v.User?.Username,
                    voteType = v.VoteType.ToString(),
                    createdAt = v.CreatedAt
                }),
                comments = suggestion.Comments.Where(c => !c.IsDeleted).Select(c => new
                {
                    id = c.Id,
                    userId = c.UserId,
                    username = c.User?.Username,
                    displayName = c.User?.DisplayName,
                    avatarUrl = c.User?.AvatarUrl,
                    content = c.Content,
                    createdAt = c.CreatedAt
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching suggestion {SuggestionId}", id);
            return StatusCode(500, new { message = "An error occurred while fetching the suggestion" });
        }
    }

    /// <summary>
    /// Update a suggestion (only by author, only if pending)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<object>> UpdateSuggestion(Guid id, [FromBody] UpdateSuggestionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var ipAddress = GetClientIPv4Address();
            var userAgent = GetUserAgent();

            var suggestion = await _suggestionService.UpdateSuggestionAsync(
                id,
                userId,
                request.SuggestedContent,
                request.Comment,
                ipAddress,
                userAgent
            );

            return Ok(new
            {
                id = suggestion.Id,
                suggestedContent = suggestion.SuggestedContent,
                comment = suggestion.Comment,
                updatedAt = suggestion.UpdatedAt
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating suggestion {SuggestionId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the suggestion" });
        }
    }

    /// <summary>
    /// Delete a suggestion (by author or admin)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteSuggestion(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var isAdmin = IsAdmin();

            var result = await _suggestionService.DeleteSuggestionAsync(id, userId, isAdmin);
            if (!result)
            {
                return NotFound(new { message = "Suggestion not found" });
            }

            return Ok(new { message = "Suggestion deleted successfully" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting suggestion {SuggestionId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the suggestion" });
        }
    }

    /// <summary>
    /// Approve a suggestion (admin only) - updates the paragraph content
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> ApproveSuggestion(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var suggestion = await _suggestionService.ApproveSuggestionAsync(id, userId);

            return Ok(new
            {
                id = suggestion.Id,
                status = suggestion.Status.ToString(),
                updatedAt = suggestion.UpdatedAt,
                message = "Suggestion approved and paragraph updated"
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving suggestion {SuggestionId}", id);
            return StatusCode(500, new { message = "An error occurred while approving the suggestion" });
        }
    }

    /// <summary>
    /// Reject a suggestion (admin only)
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> RejectSuggestion(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var suggestion = await _suggestionService.RejectSuggestionAsync(id, userId);

            return Ok(new
            {
                id = suggestion.Id,
                status = suggestion.Status.ToString(),
                updatedAt = suggestion.UpdatedAt,
                message = "Suggestion rejected"
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting suggestion {SuggestionId}", id);
            return StatusCode(500, new { message = "An error occurred while rejecting the suggestion" });
        }
    }

    /// <summary>
    /// Vote on a suggestion (upvote or downvote)
    /// </summary>
    [HttpPost("{id}/vote")]
    [Authorize]
    public async Task<ActionResult<object>> VoteOnSuggestion(Guid id, [FromBody] VoteRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();

            if (!Enum.TryParse<VoteType>(request.VoteType, true, out var voteType))
            {
                return BadRequest(new { message = "Invalid vote type. Must be 'Upvote' or 'Downvote'" });
            }

            var vote = await _suggestionService.VoteOnSuggestionAsync(id, userId, voteType);

            if (vote == null)
            {
                // Vote was removed (toggle)
                return Ok(new { message = "Vote removed", userVote = (string?)null });
            }

            return Ok(new
            {
                message = "Vote recorded",
                userVote = vote.VoteType.ToString()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error voting on suggestion {SuggestionId}", id);
            return StatusCode(500, new { message = "An error occurred while recording the vote" });
        }
    }

    /// <summary>
    /// Get vote counts for a suggestion
    /// </summary>
    [HttpGet("{id}/votes")]
    public async Task<ActionResult<object>> GetVoteCounts(Guid id)
    {
        try
        {
            var (upvotes, downvotes) = await _suggestionService.GetVoteCountsAsync(id);
            var userId = User.Identity?.IsAuthenticated == true ? GetCurrentUserId() : (Guid?)null;

            string? userVote = null;
            if (userId.HasValue)
            {
                var vote = await _suggestionService.GetUserVoteAsync(id, userId.Value);
                userVote = vote?.ToString();
            }

            return Ok(new
            {
                upvotes,
                downvotes,
                userVote
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching vote counts for suggestion {SuggestionId}", id);
            return StatusCode(500, new { message = "An error occurred while fetching vote counts" });
        }
    }
}

// Request DTOs
public class CreateSuggestionRequest
{
    public Guid ParagraphId { get; set; }
    public string SuggestedContent { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
}

public class UpdateSuggestionRequest
{
    public string SuggestedContent { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
}

public class VoteRequest
{
    public string VoteType { get; set; } = string.Empty; // "Upvote" or "Downvote"
}
