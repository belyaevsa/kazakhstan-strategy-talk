using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class ParagraphTranslation
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ParagraphId { get; set; }

    [Required]
    [MaxLength(10)]
    public string Language { get; set; } = string.Empty; // ru, en, kk

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? Caption { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    [ForeignKey("ParagraphId")]
    public Paragraph Paragraph { get; set; } = null!;
}
