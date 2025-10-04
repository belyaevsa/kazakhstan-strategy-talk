using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class PageVersion
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid PageId { get; set; }

    [Required]
    public int Version { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    // Snapshot of paragraphs at this version (JSON)
    [Required]
    public string ParagraphsSnapshot { get; set; } = string.Empty;

    public string? ChangeDescription { get; set; }

    [Required]
    public Guid UpdatedByProfileId { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(PageId))]
    public Page Page { get; set; } = null!;

    [ForeignKey(nameof(UpdatedByProfileId))]
    public Profile UpdatedByProfile { get; set; } = null!;
}
