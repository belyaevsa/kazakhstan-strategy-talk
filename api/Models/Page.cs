using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class Page
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    [MaxLength(255)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    public int OrderIndex { get; set; }

    public bool IsDraft { get; set; } = false;

    public int ViewCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Guid? UpdatedByProfileId { get; set; }

    // Foreign keys
    [Required]
    public Guid ChapterId { get; set; }

    // Navigation properties
    [ForeignKey(nameof(ChapterId))]
    public Chapter Chapter { get; set; } = null!;

    [ForeignKey(nameof(UpdatedByProfileId))]
    public Profile? UpdatedByProfile { get; set; }

    public ICollection<Paragraph> Paragraphs { get; set; } = new List<Paragraph>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
