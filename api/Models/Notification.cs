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
