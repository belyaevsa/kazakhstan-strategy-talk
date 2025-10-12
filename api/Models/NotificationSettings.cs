using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.Models;

public class NotificationSettings
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public required Guid UserId { get; set; }

    // Email notification frequency: "immediate", "hourly", "daily", "none"
    public string EmailFrequency { get; set; } = "none";

    // In-app notification preferences
    public bool NotifyOnCommentReply { get; set; } = true;
    public bool NotifyOnFollowedPageComment { get; set; } = true;
    public bool NotifyOnFollowedPageUpdate { get; set; } = true;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Profile? User { get; set; }
}
