using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class ChapterTranslation
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ChapterId { get; set; }

    [Required]
    [MaxLength(10)]
    public string Language { get; set; } = string.Empty; // ru, en, kk

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    [ForeignKey("ChapterId")]
    public Chapter Chapter { get; set; } = null!;
}
