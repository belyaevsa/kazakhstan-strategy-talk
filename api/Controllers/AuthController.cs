using Microsoft.AspNetCore.Authorization;
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
    private readonly EmailService _emailService;
    private readonly SettingsService _settingsService;

    public AuthController(AppDbContext context, TokenService tokenService, EmailService emailService, SettingsService settingsService)
    {
        _context = context;
        _tokenService = tokenService;
        _emailService = emailService;
        _settingsService = settingsService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        // Get client IP address once at the start
        var clientIp = GetClientIpAddress();

        // 1. Honeypot check - freeze for 7 days if detected
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            // Log bot attempt and create frozen dummy account
            var botUser = new Profile
            {
                Email = request.Email,
                Username = request.Username + "_bot",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                IsBlocked = true,
                FrozenUntil = DateTime.UtcNow.AddDays(7),
                RegistrationIp = clientIp
            };
            _context.Profiles.Add(botUser);
            await _context.SaveChangesAsync();

            return BadRequest(new { message = "Registration failed. Please try again later." });
        }

        // 2. Email uniqueness check
        if (await _context.Profiles.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
        {
            return BadRequest(new { message = "Email already exists" });
        }

        // 3. Username uniqueness check
        if (await _context.Profiles.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower()))
        {
            return BadRequest(new { message = "Username already taken" });
        }

        // 4. Disposable email check
        var disposableEmailDomains = await _settingsService.GetListSettingAsync("DisposableEmailDomains");
        var emailDomain = request.Email.Split('@').LastOrDefault()?.ToLower();
        if (disposableEmailDomains.Contains(emailDomain ?? ""))
        {
            return BadRequest(new { message = "Temporary email addresses are not allowed" });
        }

        // 5. Rate limiting check
        var hourAgo = DateTime.UtcNow.AddHours(-1);
        var dayAgo = DateTime.UtcNow.AddDays(-1);

        var registrationsLastHour = await _context.Profiles
            .Where(p => p.RegistrationIp == clientIp && p.CreatedAt > hourAgo)
            .CountAsync();

        var registrationsLastDay = await _context.Profiles
            .Where(p => p.RegistrationIp == clientIp && p.CreatedAt > dayAgo)
            .CountAsync();

        var maxPerHour = await _settingsService.GetIntSettingAsync("RateLimitRegistrationsPerHour", 3);
        var maxPerDay = await _settingsService.GetIntSettingAsync("RateLimitRegistrationsPerDay", 10);

        if (registrationsLastHour >= maxPerHour)
        {
            return BadRequest(new { message = "Too many registration attempts. Please try again later." });
        }

        if (registrationsLastDay >= maxPerDay)
        {
            return BadRequest(new { message = "Registration limit exceeded. Please try again tomorrow." });
        }

        // 6. Create user with email verification required
        var verificationToken = Guid.NewGuid().ToString();
        var user = new Profile
        {
            Email = request.Email,
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            EmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationTokenExpiry = DateTime.UtcNow.AddDays(1),
            RegistrationIp = clientIp,
            FrozenUntil = DateTime.UtcNow.AddHours(1) // Freeze for 1 hour until email verified or time passes
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

        // Send verification email
        try
        {
            await _emailService.SendEmailVerificationAsync(user.Email, user.Username, verificationToken);
        }
        catch (Exception ex)
        {
            // Log error but don't fail registration
            Console.WriteLine($"Failed to send verification email: {ex.Message}");
        }

        return Ok(new { message = "Registration successful! Please check your email to verify your account." });
    }

    private string GetClientIpAddress()
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        // Check for forwarded IP (for reverse proxy scenarios)
        if (HttpContext.Request.Headers.ContainsKey("X-Forwarded-For"))
        {
            ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim();
        }

        return ipAddress ?? "unknown";
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
                LastCommentAt = user.LastCommentAt,
                Language = user.Language
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
            LastCommentAt = user.LastCommentAt,
            Language = user.Language
        });
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        var user = await _context.Profiles
            .FirstOrDefaultAsync(u => u.EmailVerificationToken == token);

        if (user == null)
        {
            return BadRequest(new { message = "Invalid verification token" });
        }

        if (user.EmailVerificationTokenExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Verification token has expired" });
        }

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiry = null;
        user.FrozenUntil = null; // Unfreeze immediately upon verification

        await _context.SaveChangesAsync();

        return Ok(new { message = "Email verified successfully! You can now log in and comment." });
    }

    [HttpPut("language")]
    [Authorize]
    public async Task<IActionResult> UpdateLanguage(UpdateLanguageRequest request)
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

        user.Language = request.Language;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
