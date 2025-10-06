using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;
using KazakhstanStrategyApi.Services;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChaptersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICacheService _cache;

    public ChaptersController(AppDbContext context, ICacheService cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ChapterDTO>>> GetAllChapters([FromQuery] bool includeDrafts = false)
    {
        // Use different cache key for drafts vs non-drafts
        var cacheKey = includeDrafts ? $"{CacheKeys.AllChapters}:drafts" : CacheKeys.AllChapters;

        var cachedChapters = _cache.Get<List<ChapterDTO>>(cacheKey);
        if (cachedChapters != null)
        {
            return Ok(cachedChapters);
        }

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
            Slug = c.Slug,
            Icon = c.Icon,
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

        _cache.Set(cacheKey, chapterDTOs);
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
            Slug = chapter.Slug,
            Icon = chapter.Icon,
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

    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<ChapterDTO>> GetChapterBySlug(string slug)
    {
        var chapter = await _context.Chapters
            .Include(c => c.Pages)
                .ThenInclude(p => p.UpdatedByProfile)
            .FirstOrDefaultAsync(c => c.Slug == slug);

        if (chapter == null)
        {
            return NotFound();
        }

        var chapterDTO = new ChapterDTO
        {
            Id = chapter.Id,
            Title = chapter.Title,
            Description = chapter.Description,
            Slug = chapter.Slug,
            Icon = chapter.Icon,
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
        // Validate slug uniqueness
        var existingChapter = await _context.Chapters
            .FirstOrDefaultAsync(c => c.Slug == request.Slug);

        if (existingChapter != null)
        {
            return BadRequest(new { error = "A chapter with this slug already exists." });
        }

        var chapter = new Chapter
        {
            Title = request.Title,
            Description = request.Description,
            Slug = request.Slug,
            Icon = request.Icon,
            OrderIndex = request.OrderIndex,
            IsDraft = request.IsDraft
        };

        _context.Chapters.Add(chapter);
        await _context.SaveChangesAsync();

        // Invalidate chapters cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);

        var chapterDTO = new ChapterDTO
        {
            Id = chapter.Id,
            Title = chapter.Title,
            Description = chapter.Description,
            Slug = chapter.Slug,
            Icon = chapter.Icon,
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

        // Validate slug uniqueness if slug is being updated
        if (request.Slug != null && request.Slug != chapter.Slug)
        {
            var existingChapter = await _context.Chapters
                .FirstOrDefaultAsync(c => c.Slug == request.Slug && c.Id != id);

            if (existingChapter != null)
            {
                return BadRequest(new { error = "A chapter with this slug already exists." });
            }
        }

        if (request.Title != null) chapter.Title = request.Title;
        if (request.Description != null) chapter.Description = request.Description;
        if (request.Slug != null) chapter.Slug = request.Slug;
        if (request.Icon != null) chapter.Icon = request.Icon;
        if (request.OrderIndex.HasValue) chapter.OrderIndex = request.OrderIndex.Value;
        if (request.IsDraft.HasValue) chapter.IsDraft = request.IsDraft.Value;

        chapter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Invalidate cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);
        _cache.Remove(CacheKeys.Chapter(id));

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

        // Invalidate cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);

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

        // Invalidate cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);
        _cache.Remove(CacheKeys.Chapter(id));
        // Invalidate all page caches for this chapter
        foreach (var page in chapter.Pages)
        {
            _cache.Remove(CacheKeys.PageById(page.Id));
            _cache.Remove(CacheKeys.PageBySlug(page.Slug));
            _cache.Remove(CacheKeys.ParagraphsByPage(page.Id));
        }

        return NoContent();
    }
}
