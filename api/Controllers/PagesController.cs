using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;
using KazakhstanStrategyApi.Services;
using System.Security.Claims;
using System.Text.Json;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PagesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICacheService _cache;

    public PagesController(AppDbContext context, ICacheService cache)
    {
        _context = context;
        _cache = cache;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return userIdClaim != null ? Guid.Parse(userIdClaim) : Guid.Empty;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PageDTO>>> GetPages([FromQuery] Guid? chapterId = null)
    {
        var query = _context.Pages.AsQueryable();

        if (chapterId.HasValue)
        {
            query = query.Where(p => p.ChapterId == chapterId.Value);
        }

        var pages = await query
            .Include(p => p.UpdatedByProfile)
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
                ViewCount = p.ViewCount,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                UpdatedByUsername = p.UpdatedByProfile != null ? p.UpdatedByProfile.Username : null
            })
            .ToListAsync();

        return Ok(pages);
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<PageDTO>> GetPageBySlug(string slug)
    {
        var cacheKey = CacheKeys.PageBySlug(slug);
        var cachedPage = _cache.Get<PageDTO>(cacheKey);
        if (cachedPage != null)
        {
            // Increment view count asynchronously without blocking the response or invalidating cache
            _ = Task.Run(async () =>
            {
                var pageEntity = await _context.Pages.FirstOrDefaultAsync(p => p.Slug == slug);
                if (pageEntity != null)
                {
                    pageEntity.ViewCount++;
                    await _context.SaveChangesAsync();
                    // Note: Cache is NOT invalidated - view count will be slightly stale but cache remains effective
                }
            });

            return Ok(cachedPage);
        }

        var page = await _context.Pages
            .Include(p => p.UpdatedByProfile)
            .Where(p => p.Slug == slug)
            .Select(p => new PageDTO
            {
                Id = p.Id,
                Title = p.Title,
                Description = p.Description,
                Slug = p.Slug,
                OrderIndex = p.OrderIndex,
                IsDraft = p.IsDraft,
                ChapterId = p.ChapterId,
                ViewCount = p.ViewCount,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                UpdatedByUsername = p.UpdatedByProfile != null ? p.UpdatedByProfile.Username : null
            })
            .FirstOrDefaultAsync();

        if (page == null)
        {
            return NotFound();
        }

        // Increment view count
        var pageToUpdate = await _context.Pages.FirstOrDefaultAsync(p => p.Slug == slug);
        if (pageToUpdate != null)
        {
            pageToUpdate.ViewCount++;
            await _context.SaveChangesAsync();
            page.ViewCount = pageToUpdate.ViewCount;
        }

        _cache.Set(cacheKey, page);
        return Ok(page);
    }

    [HttpPost]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<ActionResult<PageDTO>> CreatePage(CreatePageRequest request)
    {
        // Validate slug uniqueness within the chapter
        var existingPage = await _context.Pages
            .FirstOrDefaultAsync(p => p.Slug == request.Slug && p.ChapterId == request.ChapterId);

        if (existingPage != null)
        {
            return BadRequest(new { error = "A page with this slug already exists in this chapter." });
        }

        var page = new Page
        {
            Title = request.Title,
            Description = request.Description,
            Slug = request.Slug,
            OrderIndex = request.OrderIndex,
            ChapterId = request.ChapterId
        };

        _context.Pages.Add(page);
        await _context.SaveChangesAsync();

        // Invalidate cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);

        var pageDto = new PageDTO
        {
            Id = page.Id,
            Title = page.Title,
            Description = page.Description,
            Slug = page.Slug,
            OrderIndex = page.OrderIndex,
            IsDraft = page.IsDraft,
            ChapterId = page.ChapterId,
            ViewCount = page.ViewCount,
            CreatedAt = page.CreatedAt
        };

        return CreatedAtAction(nameof(GetPageBySlug), new { slug = page.Slug }, pageDto);
    }

    [HttpPost("{id}/reorder")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> ReorderPage(Guid id, ReorderRequest request)
    {
        var page = await _context.Pages.FindAsync(id);
        if (page == null) return NotFound();

        var oldIndex = page.OrderIndex;
        var newIndex = request.NewOrderIndex;

        if (oldIndex == newIndex) return NoContent();

        // Get all pages in the same chapter to reorder
        var pages = await _context.Pages
            .Where(p => p.ChapterId == page.ChapterId)
            .OrderBy(p => p.OrderIndex)
            .ToListAsync();

        // Remove from old position
        pages.Remove(page);

        // Insert at new position
        pages.Insert(newIndex, page);

        // Update all order indices
        for (int i = 0; i < pages.Count; i++)
        {
            pages[i].OrderIndex = i;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> UpdatePage(Guid id, UpdatePageRequest request)
    {
        var page = await _context.Pages
            .Include(p => p.Paragraphs)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (page == null)
        {
            return NotFound();
        }

        var userId = GetCurrentUserId();
        var now = DateTime.UtcNow;

        // Create page version before updating (with paragraphs snapshot)
        var lastVersion = await _context.PageVersions
            .Where(pv => pv.PageId == id)
            .OrderByDescending(pv => pv.Version)
            .FirstOrDefaultAsync();

        var paragraphsSnapshot = JsonSerializer.Serialize(page.Paragraphs.OrderBy(p => p.OrderIndex).Select(p => new
        {
            p.Id,
            p.Content,
            p.OrderIndex,
            Type = p.Type.ToString()
        }));

        var newVersion = new PageVersion
        {
            PageId = page.Id,
            Version = (lastVersion?.Version ?? 0) + 1,
            Title = page.Title,
            Description = page.Description,
            ParagraphsSnapshot = paragraphsSnapshot,
            UpdatedByProfileId = userId,
            UpdatedAt = now
        };

        _context.PageVersions.Add(newVersion);

        // Validate slug uniqueness within the chapter if slug or chapter is being updated
        var targetChapterId = request.ChapterId ?? page.ChapterId;
        var targetSlug = request.Slug ?? page.Slug;

        if ((request.Slug != null && request.Slug != page.Slug) ||
            (request.ChapterId.HasValue && request.ChapterId.Value != page.ChapterId))
        {
            var existingPage = await _context.Pages
                .FirstOrDefaultAsync(p => p.Slug == targetSlug && p.ChapterId == targetChapterId && p.Id != id);

            if (existingPage != null)
            {
                return BadRequest(new { error = "A page with this slug already exists in this chapter." });
            }
        }

        // Update page
        if (request.Title != null) page.Title = request.Title;
        if (request.Description != null) page.Description = request.Description;
        if (request.Slug != null) page.Slug = request.Slug;
        if (request.OrderIndex.HasValue) page.OrderIndex = request.OrderIndex.Value;
        if (request.IsDraft.HasValue) page.IsDraft = request.IsDraft.Value;
        if (request.ChapterId.HasValue) page.ChapterId = request.ChapterId.Value;

        page.UpdatedAt = now;
        page.UpdatedByProfileId = userId;

        await _context.SaveChangesAsync();

        // Invalidate cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);
        _cache.Remove(CacheKeys.PageById(id));
        _cache.Remove(CacheKeys.PageBySlug(page.Slug));
        _cache.Remove(CacheKeys.ParagraphsByPage(id));

        return NoContent();
    }

    [HttpPost("{id}/duplicate")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<ActionResult<PageDTO>> DuplicatePage(Guid id)
    {
        var originalPage = await _context.Pages
            .Include(p => p.Paragraphs)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (originalPage == null)
        {
            return NotFound();
        }

        // Generate unique slug
        var baseSlug = $"{originalPage.Slug}-copy";
        var slug = baseSlug;
        var counter = 1;
        while (await _context.Pages.AnyAsync(p => p.Slug == slug && p.ChapterId == originalPage.ChapterId))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        // Create duplicate page
        var newPage = new Page
        {
            Title = $"{originalPage.Title} (Copy)",
            Description = originalPage.Description,
            Slug = slug,
            OrderIndex = originalPage.OrderIndex + 1,
            ChapterId = originalPage.ChapterId,
            IsDraft = true // Always create as draft
        };

        _context.Pages.Add(newPage);
        await _context.SaveChangesAsync();

        // Duplicate all paragraphs
        foreach (var paragraph in originalPage.Paragraphs.OrderBy(p => p.OrderIndex))
        {
            var newParagraph = new Paragraph
            {
                PageId = newPage.Id,
                Content = paragraph.Content,
                OrderIndex = paragraph.OrderIndex,
                Type = paragraph.Type,
                Caption = paragraph.Caption,
                LinkedPageId = paragraph.LinkedPageId
            };
            _context.Paragraphs.Add(newParagraph);
        }

        await _context.SaveChangesAsync();

        // Invalidate cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);

        var pageDto = new PageDTO
        {
            Id = newPage.Id,
            Title = newPage.Title,
            Description = newPage.Description,
            Slug = newPage.Slug,
            OrderIndex = newPage.OrderIndex,
            IsDraft = newPage.IsDraft,
            ChapterId = newPage.ChapterId,
            ViewCount = newPage.ViewCount,
            CreatedAt = newPage.CreatedAt
        };

        return CreatedAtAction(nameof(GetPageBySlug), new { slug = newPage.Slug }, pageDto);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<IActionResult> DeletePage(Guid id)
    {
        var page = await _context.Pages.FindAsync(id);

        if (page == null)
        {
            return NotFound();
        }

        _context.Pages.Remove(page);
        await _context.SaveChangesAsync();

        // Invalidate cache
        _cache.RemoveByPattern(CacheKeys.AllChapters);
        _cache.Remove(CacheKeys.PageById(id));
        _cache.Remove(CacheKeys.PageBySlug(page.Slug));
        _cache.Remove(CacheKeys.ParagraphsByPage(id));

        return NoContent();
    }
}
