using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.Models;

public class PageFollow
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public required Guid UserId { get; set; }

    [Required]
    public required Guid PageId { get; set; }

    public DateTime FollowedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Profile? User { get; set; }
    public Page? Page { get; set; }
}
