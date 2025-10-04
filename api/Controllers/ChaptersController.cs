using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChaptersController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChaptersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ChapterDTO>>> GetAllChapters([FromQuery] bool includeDrafts = false)
    {
        var query = _context.Chapters
            .Include(c => c.Pages)
                .ThenInclude(p => p.UpdatedByProfile)
            .AsQueryable();

        if (!includeDrafts)
        {
            query = query.Where(c => !c.IsDraft);
        }

        var chapters = await query
            .OrderBy(c => c.OrderIndex)
            .ToListAsync();

        var chapterDTOs = chapters.Select(c => new ChapterDTO
        {
            Id = c.Id,
            Title = c.Title,
            Description = c.Description,
            OrderIndex = c.OrderIndex,
            IsDraft = c.IsDraft,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            Pages = c.Pages
                .Where(p => includeDrafts || !p.IsDraft)
                .OrderBy(p => p.OrderIndex)
                .Select(p => new PageDTO
                {
                    Id = p.Id,
                    Title = p.Title,
                    Description = p.Description,
                    Slug = p.Slug,
                    OrderIndex = p.OrderIndex,
                    IsDraft = p.IsDraft,
                    ChapterId = p.ChapterId,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    UpdatedByUsername = p.UpdatedByProfile != null ? p.UpdatedByProfile.Username : null
                }).ToList()
        }).ToList();

        return Ok(chapterDTOs);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ChapterDTO>> GetChapter(Guid id)
    {
        var chapter = await _context.Chapters
            .Include(c => c.Pages)
                .ThenInclude(p => p.UpdatedByProfile)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (chapter == null)
        {
            return NotFound();
        }

        var chapterDTO = new ChapterDTO
        {
            Id = chapter.Id,
            Title = chapter.Title,
            Description = chapter.Description,
            OrderIndex = chapter.OrderIndex,
            IsDraft = chapter.IsDraft,
            CreatedAt = chapter.CreatedAt,
            UpdatedAt = chapter.UpdatedAt,
            Pages = chapter.Pages.OrderBy(p => p.OrderIndex).Select(p => new PageDTO
            {
                Id = p.Id,
                Title = p.Title,
                Description = p.Description,
                Slug = p.Slug,
                OrderIndex = p.OrderIndex,
                IsDraft = p.IsDraft,
                ChapterId = p.ChapterId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                UpdatedByUsername = p.UpdatedByProfile != null ? p.UpdatedByProfile.Username : null
            }).ToList()
        };

        return Ok(chapterDTO);
    }

    [HttpPost]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<ActionResult<ChapterDTO>> CreateChapter(CreateChapterRequest request)
    {
        var chapter = new Chapter
        {
            Title = request.Title,
            Description = request.Description,
            OrderIndex = request.OrderIndex,
            IsDraft = request.IsDraft
        };

        _context.Chapters.Add(chapter);
        await _context.SaveChangesAsync();

        var chapterDTO = new ChapterDTO
        {
            Id = chapter.Id,
            Title = chapter.Title,
            Description = chapter.Description,
            OrderIndex = chapter.OrderIndex,
            IsDraft = chapter.IsDraft,
            CreatedAt = chapter.CreatedAt,
            UpdatedAt = chapter.UpdatedAt,
            Pages = new List<PageDTO>()
        };

        return CreatedAtAction(nameof(GetChapter), new { id = chapter.Id }, chapterDTO);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> UpdateChapter(Guid id, UpdateChapterRequest request)
    {
        var chapter = await _context.Chapters.FindAsync(id);

        if (chapter == null)
        {
            return NotFound();
        }

        if (request.Title != null) chapter.Title = request.Title;
        if (request.Description != null) chapter.Description = request.Description;
        if (request.OrderIndex.HasValue) chapter.OrderIndex = request.OrderIndex.Value;
        if (request.IsDraft.HasValue) chapter.IsDraft = request.IsDraft.Value;

        chapter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/reorder")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> ReorderChapter(Guid id, ReorderRequest request)
    {
        var chapter = await _context.Chapters.FindAsync(id);
        if (chapter == null) return NotFound();

        var oldIndex = chapter.OrderIndex;
        var newIndex = request.NewOrderIndex;

        if (oldIndex == newIndex) return NoContent();

        // Get all chapters to reorder
        var chapters = await _context.Chapters
            .OrderBy(c => c.OrderIndex)
            .ToListAsync();

        // Remove from old position
        chapters.Remove(chapter);

        // Insert at new position
        chapters.Insert(newIndex, chapter);

        // Update all order indices
        for (int i = 0; i < chapters.Count; i++)
        {
            chapters[i].OrderIndex = i;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> DeleteChapter(Guid id)
    {
        var chapter = await _context.Chapters
            .Include(c => c.Pages)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (chapter == null)
        {
            return NotFound();
        }

        // This will cascade delete all pages and their paragraphs
        _context.Chapters.Remove(chapter);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
