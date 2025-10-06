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
[Authorize(Policy = "AdminPolicy")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly SettingsService _settingsService;

    public AdminController(AppDbContext context, SettingsService settingsService)
    {
        _context = context;
        _settingsService = settingsService;
    }

    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<AdminUserDTO>>> GetUsers([FromQuery] string? email = null)
    {
        var query = _context.Profiles
            .Include(p => p.ProfileRoles)
            .AsQueryable();

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
                DisplayName = p.DisplayName,
                Bio = p.Bio,
                Email = p.Email,
                EmailVerified = p.EmailVerified,
                CreatedAt = p.CreatedAt,
                LastCommentAt = p.LastCommentAt,
                LastSeenAt = p.LastSeenAt,
                FrozenUntil = p.FrozenUntil,
                IsBlocked = p.IsBlocked,
                RegistrationIp = p.RegistrationIp,
                Roles = p.ProfileRoles.Select(pr => pr.Role.ToString()).ToList()
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
                .ThenInclude(p => p.Chapter)
            .Include(c => c.Paragraph!)
                .ThenInclude(p => p.Page)
                    .ThenInclude(pg => pg.Chapter)
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
                ChapterSlug = c.Page != null && c.Page.Chapter != null ? c.Page.Chapter.Slug : (c.Paragraph != null && c.Paragraph.Page != null && c.Paragraph.Page.Chapter != null ? c.Paragraph.Page.Chapter.Slug : null),
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

    [HttpPost("users/{userId}/roles/{role}")]
    public async Task<IActionResult> AssignRole(Guid userId, UserRole role)
    {
        var user = await _context.Profiles
            .Include(p => p.ProfileRoles)
            .FirstOrDefaultAsync(p => p.Id == userId);

        if (user == null) return NotFound();

        // Check if user already has this role
        if (user.ProfileRoles.Any(pr => pr.Role == role))
        {
            return BadRequest("User already has this role");
        }

        var profileRole = new ProfileRole
        {
            ProfileId = userId,
            Role = role
        };

        _context.ProfileRoles.Add(profileRole);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("users/{userId}/roles/{role}")]
    public async Task<IActionResult> RemoveRole(Guid userId, UserRole role)
    {
        var profileRole = await _context.ProfileRoles
            .FirstOrDefaultAsync(pr => pr.ProfileId == userId && pr.Role == role);

        if (profileRole == null) return NotFound();

        _context.ProfileRoles.Remove(profileRole);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("settings")]
    public async Task<ActionResult<IEnumerable<AdminSettingDTO>>> GetSettings()
    {
        var settings = await _context.Settings
            .OrderBy(s => s.Key)
            .Select(s => new AdminSettingDTO
            {
                Key = s.Key,
                Value = s.Value,
                Description = s.Description,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return Ok(settings);
    }

    [HttpPut("settings/{key}")]
    public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingRequest request)
    {
        await _settingsService.SetSettingAsync(key, request.Value, request.Description);
        return NoContent();
    }

    [HttpPost("settings")]
    public async Task<IActionResult> CreateSetting([FromBody] AdminSettingDTO request)
    {
        var exists = await _context.Settings.AnyAsync(s => s.Key == request.Key);
        if (exists)
            return BadRequest("Setting with this key already exists");

        await _settingsService.SetSettingAsync(request.Key, request.Value, request.Description);
        return CreatedAtAction(nameof(GetSettings), new { key = request.Key }, request);
    }

    [HttpDelete("settings/{key}")]
    public async Task<IActionResult> DeleteSetting(string key)
    {
        var setting = await _context.Settings.FindAsync(key);
        if (setting == null) return NotFound();

        _context.Settings.Remove(setting);
        await _context.SaveChangesAsync();

        return NoContent();
    }

}
