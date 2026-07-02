using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class ContentReport
{
    [Key]
    public Guid Id { get; set; }

    // What is being reported: "Comment" or "Suggestion"
    [Required]
    [MaxLength(20)]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    public Guid ContentId { get; set; }

    // Short reason category, e.g. "spam", "abuse", "offtopic", "other"
    [Required]
    [MaxLength(50)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Details { get; set; }

    // "Pending", "Reviewed", "Dismissed"
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }

    // Reporter
    [Required]
    public Guid ReporterProfileId { get; set; }

    public Guid? ReviewedByProfileId { get; set; }

    // Navigation
    [ForeignKey(nameof(ReporterProfileId))]
    public Profile ReporterProfile { get; set; } = null!;

    [ForeignKey(nameof(ReviewedByProfileId))]
    public Profile? ReviewedByProfile { get; set; }
}
