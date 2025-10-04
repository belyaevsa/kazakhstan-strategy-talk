using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.Models;

public class Profile
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

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

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<CommentVote> CommentVotes { get; set; } = new List<CommentVote>();
    public ICollection<ProfileRole> ProfileRoles { get; set; } = new List<ProfileRole>();
}
