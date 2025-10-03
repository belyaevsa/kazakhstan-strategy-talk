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
public class CommentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CommentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("page/{pageId}")]
    public async Task<ActionResult<IEnumerable<CommentDTO>>> GetCommentsByPage(Guid pageId)
    {
        var comments = await _context.Comments
            .Include(c => c.User)
            .Where(c => c.PageId == pageId && c.ParentId == null && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(await MapCommentsWithReplies(comments));
    }

    [HttpGet("paragraph/{paragraphId}")]
    public async Task<ActionResult<IEnumerable<CommentDTO>>> GetCommentsByParagraph(Guid paragraphId)
    {
        var comments = await _context.Comments
            .Include(c => c.User)
            .Where(c => c.ParagraphId == paragraphId && c.ParentId == null && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(await MapCommentsWithReplies(comments));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<CommentDTO>> CreateComment(CreateCommentRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var comment = new Comment
        {
            Content = request.Content,
            UserId = userId.Value,
            PageId = request.PageId,
            ParagraphId = request.ParagraphId,
            ParentId = request.ParentId
        };

        _context.Comments.Add(comment);

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

        var user = await _context.Profiles.FindAsync(userId.Value);

        var commentDto = new CommentDTO
        {
            Id = comment.Id,
            Content = comment.Content,
            AgreeCount = comment.AgreeCount,
            DisagreeCount = comment.DisagreeCount,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
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
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var comment = await _context.Comments.FindAsync(id);

        if (comment == null)
        {
            return NotFound();
        }

        if (comment.UserId != userId.Value)
        {
            return Forbid();
        }

        comment.Content = request.Content;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var comment = await _context.Comments.FindAsync(id);

        if (comment == null)
        {
            return NotFound();
        }

        if (comment.UserId != userId.Value)
        {
            return Forbid();
        }

        // Update comment count if it's a paragraph comment
        if (comment.ParagraphId.HasValue)
        {
            var paragraph = await _context.Paragraphs.FindAsync(comment.ParagraphId.Value);
            if (paragraph != null && paragraph.CommentCount > 0)
            {
                paragraph.CommentCount--;
            }
        }

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/vote")]
    [Authorize]
    public async Task<IActionResult> VoteComment(Guid id, VoteRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var comment = await _context.Comments.FindAsync(id);
        if (comment == null) return NotFound();

        var existingVote = await _context.CommentVotes
            .FirstOrDefaultAsync(v => v.CommentId == id && v.UserId == userId.Value);

        if (existingVote != null)
        {
            // Update vote counts
            if (existingVote.VoteType == "agree") comment.AgreeCount--;
            else comment.DisagreeCount--;

            if (existingVote.VoteType == request.VoteType)
            {
                // Remove vote if same type
                _context.CommentVotes.Remove(existingVote);
            }
            else
            {
                // Change vote type
                existingVote.VoteType = request.VoteType;
                if (request.VoteType == "agree") comment.AgreeCount++;
                else comment.DisagreeCount++;
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
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : null;
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
            .Where(c => c.ParentId == commentId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return await MapCommentsWithReplies(replies);
    }
}
