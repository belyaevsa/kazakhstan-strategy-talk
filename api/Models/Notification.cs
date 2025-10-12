using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.Models;

public class Notification
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public required Guid UserId { get; set; }

    [Required]
    public required string Type { get; set; } // "NewComment", "CommentReply", "PageUpdate"

    [Required]
    public required string Title { get; set; }

    [Required]
    public required string Message { get; set; }

    // Localization fields - translation keys and parameters
    public string? TitleKey { get; set; }
    public string? MessageKey { get; set; }
    public string? Parameters { get; set; } // JSON string with interpolation values

    public Guid? PageId { get; set; }
    public Guid? CommentId { get; set; }
    public Guid? RelatedUserId { get; set; } // User who triggered the notification

    public bool IsRead { get; set; } = false;
    public bool EmailSent { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    // Navigation properties
    public Profile? User { get; set; }
    public Page? Page { get; set; }
    public Comment? Comment { get; set; }
}
