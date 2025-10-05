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
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        TokenService tokenService,
        EmailService emailService,
        SettingsService settingsService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _emailService = emailService;
        _settingsService = settingsService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        _logger.LogInformation("Registration attempt started for email: {Email}, username: {Username}",
            request.Email, request.Username);

        // Get client IP address once at the start
        var clientIp = GetClientIpAddress();

        // 1. Honeypot check - freeze for 7 days if detected
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            _logger.LogWarning("Bot detected during registration - Honeypot triggered. Email: {Email}, IP: {IpAddress}, Website: {Website}",
                request.Email, clientIp, request.Website);

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

            _logger.LogInformation("Bot user created and frozen. Email: {Email}, IP: {IpAddress}",
                request.Email, clientIp);

            return BadRequest(new { message = "Registration failed. Please try again later." });
        }

        // 2. Email uniqueness check
        var existingUser = await _context.Profiles.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (existingUser != null)
        {
            // If email exists but is not verified, suggest resending verification email
            if (!existingUser.EmailVerified)
            {
                _logger.LogWarning("Registration validation failed - Email exists but not verified: {Email}, IP: {IpAddress}",
                    request.Email, clientIp);
                return BadRequest(new {
                    message = "This email is already registered but not verified. Would you like to resend the verification email?",
                    code = "EMAIL_NOT_VERIFIED",
                    canResend = true
                });
            }

            _logger.LogWarning("Registration validation failed - Email already exists: {Email}, IP: {IpAddress}",
                request.Email, clientIp);
            return BadRequest(new { message = "Email already exists" });
        }

        // 3. Disposable email check
        var disposableEmailDomains = await _settingsService.GetListSettingAsync("DisposableEmailDomains");
        var emailDomain = request.Email.Split('@').LastOrDefault()?.ToLower();
        if (disposableEmailDomains.Contains(emailDomain ?? ""))
        {
            _logger.LogWarning("Registration validation failed - Disposable email domain blocked: {Email}, Domain: {Domain}, IP: {IpAddress}",
                request.Email, emailDomain, clientIp);
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
            _logger.LogWarning("Registration rate limit exceeded - Hourly limit reached. IP: {IpAddress}, Count: {Count}, Limit: {Limit}",
                clientIp, registrationsLastHour, maxPerHour);
            return BadRequest(new { message = "Too many registration attempts. Please try again later." });
        }

        if (registrationsLastDay >= maxPerDay)
        {
            _logger.LogWarning("Registration rate limit exceeded - Daily limit reached. IP: {IpAddress}, Count: {Count}, Limit: {Limit}",
                clientIp, registrationsLastDay, maxPerDay);
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

        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("User profile created successfully. Email: {Email}, Username: {Username}, UserId: {UserId}, IP: {IpAddress}",
                user.Email, user.Username, user.Id, clientIp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while saving user profile to database. Email: {Email}, IP: {IpAddress}",
                request.Email, clientIp);
            throw;
        }

        // Assign Viewer role by default
        var viewerRole = new ProfileRole
        {
            ProfileId = user.Id,
            Role = UserRole.Viewer
        };
        _context.ProfileRoles.Add(viewerRole);

        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Viewer role assigned to user. UserId: {UserId}, Email: {Email}",
                user.Id, user.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while assigning role to user. UserId: {UserId}, Email: {Email}",
                user.Id, request.Email);
            throw;
        }

        // Send verification email
        try
        {
            await _emailService.SendEmailVerificationAsync(user.Email, user.Username, verificationToken);
            _logger.LogInformation("Verification email sent successfully. Email: {Email}, UserId: {UserId}",
                user.Email, user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email. Email: {Email}, UserId: {UserId}",
                user.Email, user.Id);
            // Don't fail registration if email fails
        }

        _logger.LogInformation("Registration completed successfully. Email: {Email}, Username: {Username}, UserId: {UserId}",
            user.Email, user.Username, user.Id);

        return Ok(new { message = "Registration successful! Please check your email to verify your account." });
    }

    private string GetClientIpAddress()
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        // Convert IPv6 loopback to IPv4
        if (ipAddress == "::1")
        {
            ipAddress = "127.0.0.1";
        }

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
        var clientIp = GetClientIpAddress();
        _logger.LogInformation("Login attempt started for email: {Email}, IP: {IpAddress}",
            request.Email, clientIp);

        var user = await _context.Profiles.FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed - Invalid credentials. Email: {Email}, IP: {IpAddress}",
                request.Email, clientIp);
            return Unauthorized(new { message = "Invalid email or password" });
        }

        if (!user.EmailVerified)
        {
            _logger.LogWarning("Login failed - Email not verified. Email: {Email}, UserId: {UserId}, IP: {IpAddress}",
                user.Email, user.Id, clientIp);
            return Unauthorized(new { message = "Please verify your email address before logging in. Check your inbox for the verification link." });
        }

        if (user.IsBlocked)
        {
            _logger.LogWarning("Login failed - Account blocked. Email: {Email}, UserId: {UserId}, IP: {IpAddress}",
                user.Email, user.Id, clientIp);
            return Unauthorized(new { message = "Your account has been blocked. Please contact support." });
        }

        if (user.FrozenUntil.HasValue && user.FrozenUntil > DateTime.UtcNow)
        {
            var remainingTime = user.FrozenUntil.Value - DateTime.UtcNow;
            var message = remainingTime.TotalHours > 24
                ? $"Your account is temporarily frozen. Please try again in {Math.Ceiling(remainingTime.TotalDays)} days."
                : $"Your account is temporarily frozen. Please try again in {Math.Ceiling(remainingTime.TotalHours)} hours.";

            _logger.LogWarning("Login failed - Account frozen. Email: {Email}, UserId: {UserId}, FrozenUntil: {FrozenUntil}, IP: {IpAddress}",
                user.Email, user.Id, user.FrozenUntil, clientIp);

            return Unauthorized(new { message });
        }

        var token = await _tokenService.GenerateTokenAsync(user);

        var roles = await _context.ProfileRoles
            .Where(pr => pr.ProfileId == user.Id)
            .Select(pr => pr.Role.ToString())
            .ToListAsync();

        _logger.LogInformation("Login successful. Email: {Email}, UserId: {UserId}, Roles: {Roles}, IP: {IpAddress}",
            user.Email, user.Id, string.Join(", ", roles), clientIp);

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
        var clientIp = GetClientIpAddress();
        _logger.LogDebug("Get current user request received. IP: {IpAddress}", clientIp);

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (userId == null)
        {
            _logger.LogWarning("Get current user failed - No user ID in claims. IP: {IpAddress}", clientIp);
            return Unauthorized();
        }

        _logger.LogDebug("Fetching user profile for UserId: {UserId}, IP: {IpAddress}", userId, clientIp);

        var user = await _context.Profiles.FindAsync(Guid.Parse(userId));

        if (user == null)
        {
            _logger.LogWarning("Get current user failed - User not found in database. UserId: {UserId}, IP: {IpAddress}",
                userId, clientIp);
            return NotFound();
        }

        var roles = await _context.ProfileRoles
            .Where(pr => pr.ProfileId == user.Id)
            .Select(pr => pr.Role.ToString())
            .ToListAsync();

        _logger.LogInformation("Current user retrieved successfully. UserId: {UserId}, Email: {Email}, Roles: {Roles}, IP: {IpAddress}",
            user.Id, user.Email, string.Join(", ", roles), clientIp);

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
        var clientIp = GetClientIpAddress();
        var appBaseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL")
            ?? _settingsService.GetSettingAsync("AppBaseUrl").Result
            ?? "http://localhost:8080";

        _logger.LogInformation("Email verification attempt with token: {TokenPrefix}..., IP: {IpAddress}",
            token?[..Math.Min(8, token?.Length ?? 0)], clientIp);

        var user = await _context.Profiles
            .FirstOrDefaultAsync(u => u.EmailVerificationToken == token);

        if (user == null)
        {
            _logger.LogWarning("Email verification failed - Invalid token. Token: {TokenPrefix}..., IP: {IpAddress}",
                token?[..Math.Min(8, token?.Length ?? 0)], clientIp);
            return Redirect($"{appBaseUrl}/verify-email?status=error&message=Invalid verification token");
        }

        if (user.EmailVerificationTokenExpiry < DateTime.UtcNow)
        {
            _logger.LogWarning("Email verification failed - Token expired. Email: {Email}, UserId: {UserId}, Expiry: {Expiry}, IP: {IpAddress}",
                user.Email, user.Id, user.EmailVerificationTokenExpiry, clientIp);
            return Redirect($"{appBaseUrl}/verify-email?status=error&message=Verification token has expired");
        }

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiry = null;
        user.FrozenUntil = null; // Unfreeze immediately upon verification

        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Email verified successfully. Email: {Email}, UserId: {UserId}, IP: {IpAddress}",
                user.Email, user.Id, clientIp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while saving email verification. Email: {Email}, UserId: {UserId}",
                user.Email, user.Id);
            return Redirect($"{appBaseUrl}/verify-email?status=error&message=An error occurred during verification");
        }

        return Redirect($"{appBaseUrl}/verify-email?status=success&message=Email verified successfully");
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerificationEmail([FromBody] ResendVerificationRequest request)
    {
        var clientIp = GetClientIpAddress();
        _logger.LogInformation("Resend verification email request for: {Email}, IP: {IpAddress}",
            request.Email, clientIp);

        var user = await _context.Profiles.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

        if (user == null)
        {
            _logger.LogWarning("Resend verification failed - User not found: {Email}, IP: {IpAddress}",
                request.Email, clientIp);
            return BadRequest(new { message = "User not found" });
        }

        if (user.EmailVerified)
        {
            _logger.LogWarning("Resend verification failed - Email already verified: {Email}, IP: {IpAddress}",
                request.Email, clientIp);
            return BadRequest(new { message = "Email is already verified" });
        }

        // Generate new verification token and update expiry
        var verificationToken = Guid.NewGuid().ToString();
        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationTokenExpiry = DateTime.UtcNow.AddDays(1);
        user.FrozenUntil = DateTime.UtcNow.AddHours(1); // Reset freeze period

        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Verification token updated. Email: {Email}, UserId: {UserId}, IP: {IpAddress}",
                user.Email, user.Id, clientIp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while updating verification token. Email: {Email}, UserId: {UserId}",
                user.Email, user.Id);
            return StatusCode(500, new { message = "An error occurred while processing your request" });
        }

        // Send verification email
        try
        {
            await _emailService.SendEmailVerificationAsync(user.Email, user.Username, verificationToken);
            _logger.LogInformation("Verification email resent successfully. Email: {Email}, UserId: {UserId}",
                user.Email, user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resend verification email. Email: {Email}, UserId: {UserId}",
                user.Email, user.Id);
            return StatusCode(500, new { message = "Failed to send verification email" });
        }

        return Ok(new { message = "Verification email has been resent. Please check your inbox." });
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
