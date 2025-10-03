using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;

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

    [HttpGet("page/{pageId}")]
    public async Task<ActionResult<IEnumerable<ParagraphDTO>>> GetParagraphsByPage(Guid pageId, [FromQuery] bool includeHidden = false)
    {
        var query = _context.Paragraphs.Where(p => p.PageId == pageId);

        if (!includeHidden)
        {
            query = query.Where(p => !p.IsHidden);
        }

        var paragraphs = await query
            .OrderBy(p => p.OrderIndex)
            .Select(p => new ParagraphDTO
            {
                Id = p.Id,
                Content = p.Content,
                OrderIndex = p.OrderIndex,
                CommentCount = p.CommentCount,
                IsHidden = p.IsHidden,
                Type = p.Type.ToString(),
                PageId = p.PageId,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(paragraphs);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ParagraphDTO>> GetParagraph(Guid id)
    {
        var paragraph = await _context.Paragraphs
            .Where(p => p.Id == id)
            .Select(p => new ParagraphDTO
            {
                Id = p.Id,
                Content = p.Content,
                OrderIndex = p.OrderIndex,
                CommentCount = p.CommentCount,
                IsHidden = p.IsHidden,
                Type = p.Type.ToString(),
                PageId = p.PageId,
                CreatedAt = p.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (paragraph == null)
        {
            return NotFound();
        }

        return Ok(paragraph);
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
            Type = paragraphType
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
            PageId = paragraph.PageId,
            CreatedAt = paragraph.CreatedAt
        };

        return CreatedAtAction(nameof(GetParagraph), new { id = paragraph.Id }, paragraphDto);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> UpdateParagraph(Guid id, UpdateParagraphRequest request)
    {
        var paragraph = await _context.Paragraphs.FindAsync(id);

        if (paragraph == null)
        {
            return NotFound();
        }

        if (request.Content != null) paragraph.Content = request.Content;
        if (request.OrderIndex.HasValue) paragraph.OrderIndex = request.OrderIndex.Value;
        if (request.IsHidden.HasValue) paragraph.IsHidden = request.IsHidden.Value;
        if (request.Type != null && Enum.TryParse<ParagraphType>(request.Type, out var paragraphType))
        {
            paragraph.Type = paragraphType;
        }

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
}
