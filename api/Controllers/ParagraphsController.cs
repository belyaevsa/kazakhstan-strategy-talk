using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;
using System.Security.Claims;
using System.Text.Json;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParagraphsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ParagraphsController(AppDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : Guid.Empty;
    }

    [HttpGet("page/{pageId}")]
    public async Task<ActionResult<IEnumerable<ParagraphDTO>>> GetParagraphsByPage(Guid pageId, [FromQuery] bool includeHidden = false)
    {
        var query = _context.Paragraphs.Where(p => p.PageId == pageId);

        if (!includeHidden)
        {
            query = query.Where(p => !p.IsHidden);
        }

        var paragraphs = await query
            .Include(p => p.UpdatedByProfile)
            .OrderBy(p => p.OrderIndex)
            .ToListAsync();

        var paragraphDTOs = new List<ParagraphDTO>();

        foreach (var p in paragraphs)
        {
            // Count only non-deleted comments
            var commentCount = await _context.Comments
                .Where(c => c.ParagraphId == p.Id && !c.IsDeleted)
                .CountAsync();

            paragraphDTOs.Add(new ParagraphDTO
            {
                Id = p.Id,
                Content = p.Content,
                OrderIndex = p.OrderIndex,
                CommentCount = commentCount,
                IsHidden = p.IsHidden,
                Type = p.Type.ToString(),
                Caption = p.Caption,
                PageId = p.PageId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                UpdatedByUsername = p.UpdatedByProfile != null ? p.UpdatedByProfile.Username : null
            });
        }

        return Ok(paragraphDTOs);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ParagraphDTO>> GetParagraph(Guid id)
    {
        var paragraph = await _context.Paragraphs
            .Include(p => p.UpdatedByProfile)
            .Where(p => p.Id == id)
            .FirstOrDefaultAsync();

        if (paragraph == null)
        {
            return NotFound();
        }

        // Count only non-deleted comments
        var commentCount = await _context.Comments
            .Where(c => c.ParagraphId == paragraph.Id && !c.IsDeleted)
            .CountAsync();

        return Ok(new ParagraphDTO
        {
            Id = paragraph.Id,
            Content = paragraph.Content,
            OrderIndex = paragraph.OrderIndex,
            CommentCount = commentCount,
            IsHidden = paragraph.IsHidden,
            Type = paragraph.Type.ToString(),
            Caption = paragraph.Caption,
            PageId = paragraph.PageId,
            CreatedAt = paragraph.CreatedAt,
            UpdatedAt = paragraph.UpdatedAt,
            UpdatedByUsername = paragraph.UpdatedByProfile != null ? paragraph.UpdatedByProfile.Username : null
        });
    }

    [HttpPost]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<ActionResult<ParagraphDTO>> CreateParagraph(CreateParagraphRequest request)
    {
        if (!Enum.TryParse<ParagraphType>(request.Type, out var paragraphType))
        {
            paragraphType = ParagraphType.Text;
        }

        var paragraph = new Paragraph
        {
            Content = request.Content,
            OrderIndex = request.OrderIndex,
            PageId = request.PageId,
            Type = paragraphType,
            Caption = request.Caption
        };

        _context.Paragraphs.Add(paragraph);
        await _context.SaveChangesAsync();

        var paragraphDto = new ParagraphDTO
        {
            Id = paragraph.Id,
            Content = paragraph.Content,
            OrderIndex = paragraph.OrderIndex,
            CommentCount = paragraph.CommentCount,
            IsHidden = paragraph.IsHidden,
            Type = paragraph.Type.ToString(),
            Caption = paragraph.Caption,
            PageId = paragraph.PageId,
            CreatedAt = paragraph.CreatedAt
        };

        return CreatedAtAction(nameof(GetParagraph), new { id = paragraph.Id }, paragraphDto);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> UpdateParagraph(Guid id, UpdateParagraphRequest request)
    {
        var paragraph = await _context.Paragraphs
            .Include(p => p.Page)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (paragraph == null)
        {
            return NotFound();
        }

        var userId = GetCurrentUserId();
        var now = DateTime.UtcNow;

        // Create paragraph version before updating
        var lastVersion = await _context.ParagraphVersions
            .Where(pv => pv.ParagraphId == id)
            .OrderByDescending(pv => pv.Version)
            .FirstOrDefaultAsync();

        var newVersion = new ParagraphVersion
        {
            ParagraphId = paragraph.Id,
            Version = (lastVersion?.Version ?? 0) + 1,
            Content = paragraph.Content,
            Type = paragraph.Type,
            UpdatedByProfileId = userId,
            UpdatedAt = now
        };

        _context.ParagraphVersions.Add(newVersion);

        // Update paragraph
        if (request.Content != null) paragraph.Content = request.Content;
        if (request.OrderIndex.HasValue) paragraph.OrderIndex = request.OrderIndex.Value;
        if (request.IsHidden.HasValue) paragraph.IsHidden = request.IsHidden.Value;
        if (request.Type != null && Enum.TryParse<ParagraphType>(request.Type, out var paragraphType))
        {
            paragraph.Type = paragraphType;
        }
        if (request.Caption != null) paragraph.Caption = request.Caption;

        paragraph.UpdatedAt = now;
        paragraph.UpdatedByProfileId = userId;

        // Update page's UpdatedAt and UpdatedByProfileId
        paragraph.Page.UpdatedAt = now;
        paragraph.Page.UpdatedByProfileId = userId;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/reorder")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> ReorderParagraph(Guid id, ReorderRequest request)
    {
        var paragraph = await _context.Paragraphs.FindAsync(id);
        if (paragraph == null) return NotFound();

        var oldIndex = paragraph.OrderIndex;
        var newIndex = request.NewOrderIndex;

        if (oldIndex == newIndex) return NoContent();

        // Get all paragraphs on the same page to reorder
        var paragraphs = await _context.Paragraphs
            .Where(p => p.PageId == paragraph.PageId)
            .OrderBy(p => p.OrderIndex)
            .ToListAsync();

        // Remove from old position
        paragraphs.Remove(paragraph);

        // Insert at new position
        paragraphs.Insert(newIndex, paragraph);

        // Update all order indices
        for (int i = 0; i < paragraphs.Count; i++)
        {
            paragraphs[i].OrderIndex = i;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> DeleteParagraph(Guid id)
    {
        var paragraph = await _context.Paragraphs.FindAsync(id);

        if (paragraph == null)
        {
            return NotFound();
        }

        _context.Paragraphs.Remove(paragraph);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("recalculate-comment-counts")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> RecalculateCommentCounts()
    {
        var paragraphs = await _context.Paragraphs.ToListAsync();

        foreach (var paragraph in paragraphs)
        {
            var count = await _context.Comments
                .Where(c => c.ParagraphId == paragraph.Id && !c.IsDeleted)
                .CountAsync();

            paragraph.CommentCount = count;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Comment counts recalculated successfully" });
    }
}
