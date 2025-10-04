using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.DTOs;
using KazakhstanStrategyApi.Models;
using KazakhstanStrategyApi.Services;
using BCrypt.Net;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;

    public AuthController(AppDbContext context, TokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (await _context.Profiles.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest(new { message = "Email already exists" });
        }

        var user = new Profile
        {
            Email = request.Email,
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        _context.Profiles.Add(user);
        await _context.SaveChangesAsync();

        // Assign Viewer role by default
        var viewerRole = new ProfileRole
        {
            ProfileId = user.Id,
            Role = UserRole.Viewer
        };
        _context.ProfileRoles.Add(viewerRole);
        await _context.SaveChangesAsync();

        var token = await _tokenService.GenerateTokenAsync(user);

        return Ok(new AuthResponse
        {
            Token = token,
            User = new UserDTO
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                AvatarUrl = user.AvatarUrl,
                Roles = new List<string> { "Viewer" },
                IsBlocked = false,
                FrozenUntil = null,
                LastCommentAt = null
            }
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _context.Profiles.FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        if (user.IsBlocked)
        {
            return Unauthorized(new { message = "Your account has been blocked" });
        }

        var token = await _tokenService.GenerateTokenAsync(user);

        var roles = await _context.ProfileRoles
            .Where(pr => pr.ProfileId == user.Id)
            .Select(pr => pr.Role.ToString())
            .ToListAsync();

        return Ok(new AuthResponse
        {
            Token = token,
            User = new UserDTO
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                AvatarUrl = user.AvatarUrl,
                Roles = roles,
                IsBlocked = user.IsBlocked,
                FrozenUntil = user.FrozenUntil,
                LastCommentAt = user.LastCommentAt
            }
        });
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserDTO>> GetCurrentUser()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (userId == null)
        {
            return Unauthorized();
        }

        var user = await _context.Profiles.FindAsync(Guid.Parse(userId));

        if (user == null)
        {
            return NotFound();
        }

        var roles = await _context.ProfileRoles
            .Where(pr => pr.ProfileId == user.Id)
            .Select(pr => pr.Role.ToString())
            .ToListAsync();

        return Ok(new UserDTO
        {
            Id = user.Id,
            Email = user.Email,
            Username = user.Username,
            AvatarUrl = user.AvatarUrl,
            Roles = roles,
            IsBlocked = user.IsBlocked,
            FrozenUntil = user.FrozenUntil,
            LastCommentAt = user.LastCommentAt
        });
    }
}
