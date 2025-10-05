using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminPolicy")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<AdminUserDTO>>> GetUsers([FromQuery] string? email = null)
    {
        var query = _context.Profiles.AsQueryable();

        if (!string.IsNullOrEmpty(email))
        {
            query = query.Where(p => p.Email.Contains(email));
        }

        var users = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new AdminUserDTO
            {
                Id = p.Id,
                Username = p.Username,
                Email = p.Email,
                CreatedAt = p.CreatedAt,
                LastCommentAt = p.LastCommentAt,
                FrozenUntil = p.FrozenUntil,
                IsBlocked = p.IsBlocked
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("comments")]
    public async Task<ActionResult<IEnumerable<AdminCommentDTO>>> GetComments([FromQuery] Guid? pageId = null)
    {
        var query = _context.Comments
            .Include(c => c.User)
            .Include(c => c.Page)
            .Include(c => c.Paragraph)
                .ThenInclude(p => p.Page)
            .AsQueryable();

        if (pageId.HasValue)
        {
            query = query.Where(c => c.PageId == pageId.Value || (c.Paragraph != null && c.Paragraph.PageId == pageId.Value));
        }

        var comments = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new AdminCommentDTO
            {
                Id = c.Id,
                Content = c.Content,
                AuthorId = c.UserId,
                AuthorName = c.User.Username,
                AuthorEmail = c.User.Email,
                CreatedAt = c.CreatedAt,
                PageTitle = c.Page != null ? c.Page.Title : (c.Paragraph != null && c.Paragraph.Page != null ? c.Paragraph.Page.Title : null),
                PageSlug = c.Page != null ? c.Page.Slug : (c.Paragraph != null && c.Paragraph.Page != null ? c.Paragraph.Page.Slug : null),
                PageId = c.PageId ?? (c.Paragraph != null ? c.Paragraph.PageId : null),
                ParagraphId = c.ParagraphId,
                IpAddress = c.IpAddress,
                IsDeleted = c.IsDeleted
            })
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("users/{userId}/freeze")]
    public async Task<IActionResult> FreezeUser(Guid userId, [FromBody] FreezeUserRequest request)
    {
        var user = await _context.Profiles.FindAsync(userId);
        if (user == null) return NotFound();

        user.FrozenUntil = request.FreezeUntil;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("users/{userId}/unfreeze")]
    public async Task<IActionResult> UnfreezeUser(Guid userId)
    {
        var user = await _context.Profiles.FindAsync(userId);
        if (user == null) return NotFound();

        user.FrozenUntil = null;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("users/{userId}/block")]
    public async Task<IActionResult> BlockUser(Guid userId)
    {
        var user = await _context.Profiles.FindAsync(userId);
        if (user == null) return NotFound();

        user.IsBlocked = true;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("users/{userId}/unblock")]
    public async Task<IActionResult> UnblockUser(Guid userId)
    {
        var user = await _context.Profiles.FindAsync(userId);
        if (user == null) return NotFound();

        user.IsBlocked = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }

}
