using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.DTOs;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$",
        ErrorMessage = "Password must contain uppercase, lowercase, and number")]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MinLength(3)]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    // Honeypot field - should be empty
    public string? Website { get; set; }
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDTO User { get; set; } = null!;
}

public class UserDTO
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public List<string> Roles { get; set; } = new();
    public bool IsBlocked { get; set; }
    public DateTime? FrozenUntil { get; set; }
    public DateTime? LastCommentAt { get; set; }
    public string Language { get; set; } = "ru";
}

public class UpdateLanguageRequest
{
    [Required]
    [RegularExpression("^(ru|en|kk)$", ErrorMessage = "Language must be ru, en, or kk")]
    public string Language { get; set; } = string.Empty;
}
