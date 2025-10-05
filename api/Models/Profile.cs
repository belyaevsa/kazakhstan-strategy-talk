using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.Models;

public class Profile
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? DisplayName { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    public string? AvatarUrl { get; set; }

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public bool IsBlocked { get; set; } = false;

    public DateTime? FrozenUntil { get; set; }

    public DateTime? LastCommentAt { get; set; }

    public DateTime? LastSeenAt { get; set; }

    [MaxLength(10)]
    public string Language { get; set; } = "ru"; // Default: Russian (ru), also supports: en (English), kk (Kazakh)

    // Privacy settings
    public bool ShowEmail { get; set; } = false;
    public bool EmailNotifications { get; set; } = true;

    [MaxLength(50)]
    public string TimeZone { get; set; } = "UTC";

    // Email verification
    public bool EmailVerified { get; set; } = false;
    [MaxLength(100)]
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiry { get; set; }

    // IP tracking for rate limiting
    [MaxLength(45)] // IPv6 max length
    public string? RegistrationIp { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<CommentVote> CommentVotes { get; set; } = new List<CommentVote>();
    public ICollection<ProfileRole> ProfileRoles { get; set; } = new List<ProfileRole>();
}
