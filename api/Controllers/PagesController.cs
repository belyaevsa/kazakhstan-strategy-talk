using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PagesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PagesController(AppDbContext context)
    {
        _context = context;
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
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(pages);
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<PageDTO>> GetPageBySlug(string slug)
    {
        var page = await _context.Pages
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
                CreatedAt = p.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (page == null)
        {
            return NotFound();
        }

        return Ok(page);
    }

    [HttpPost]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<ActionResult<PageDTO>> CreatePage(CreatePageRequest request)
    {
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

        var pageDto = new PageDTO
        {
            Id = page.Id,
            Title = page.Title,
            Description = page.Description,
            Slug = page.Slug,
            OrderIndex = page.OrderIndex,
            IsDraft = page.IsDraft,
            ChapterId = page.ChapterId,
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
        var page = await _context.Pages.FindAsync(id);

        if (page == null)
        {
            return NotFound();
        }

        if (request.Title != null) page.Title = request.Title;
        if (request.Description != null) page.Description = request.Description;
        if (request.Slug != null) page.Slug = request.Slug;
        if (request.OrderIndex.HasValue) page.OrderIndex = request.OrderIndex.Value;
        if (request.IsDraft.HasValue) page.IsDraft = request.IsDraft.Value;
        if (request.ChapterId.HasValue) page.ChapterId = request.ChapterId.Value;

        await _context.SaveChangesAsync();

        return NoContent();
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

        return NoContent();
    }
}
