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
    public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllUsers()
    {
        var users = await _context.Profiles
            .Include(p => p.ProfileRoles)
            .Select(u => new UserDTO
            {
                Id = u.Id,
                Email = u.Email,
                Username = u.Username,
                AvatarUrl = u.AvatarUrl,
                Roles = u.ProfileRoles.Select(pr => pr.Role.ToString()).ToList(),
                IsBlocked = u.IsBlocked
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("users/{userId}/roles")]
    public async Task<IActionResult> AssignRole(Guid userId, [FromBody] AssignRoleRequest request)
    {
        var user = await _context.Profiles.FindAsync(userId);
        if (user == null) return NotFound();

        if (!Enum.TryParse<UserRole>(request.Role, out var role))
        {
            return BadRequest(new { message = "Invalid role" });
        }

        // Check if role already assigned
        var existingRole = await _context.ProfileRoles
            .FirstOrDefaultAsync(pr => pr.ProfileId == userId && pr.Role == role);

        if (existingRole != null)
        {
            return BadRequest(new { message = "User already has this role" });
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
    public async Task<IActionResult> RemoveRole(Guid userId, string role)
    {
        if (!Enum.TryParse<UserRole>(role, out var userRole))
        {
            return BadRequest(new { message = "Invalid role" });
        }

        var profileRole = await _context.ProfileRoles
            .FirstOrDefaultAsync(pr => pr.ProfileId == userId && pr.Role == userRole);

        if (profileRole == null)
        {
            return NotFound();
        }

        // Don't allow removing Viewer role if it's the only role
        var userRolesCount = await _context.ProfileRoles
            .CountAsync(pr => pr.ProfileId == userId);

        if (userRolesCount <= 1 && userRole == UserRole.Viewer)
        {
            return BadRequest(new { message = "Cannot remove Viewer role - users must have at least one role" });
        }

        _context.ProfileRoles.Remove(profileRole);
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

    [HttpDelete("comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        var comment = await _context.Comments.FindAsync(commentId);
        if (comment == null) return NotFound();

        // Soft delete - keep in database but mark as deleted
        comment.IsDeleted = true;
        comment.DeletedAt = DateTime.UtcNow;

        // Update comment count if it's a paragraph comment
        if (comment.ParagraphId.HasValue)
        {
            var paragraph = await _context.Paragraphs.FindAsync(comment.ParagraphId.Value);
            if (paragraph != null && paragraph.CommentCount > 0)
            {
                paragraph.CommentCount--;
            }
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class AssignRoleRequest
{
    public string Role { get; set; } = string.Empty;
}
