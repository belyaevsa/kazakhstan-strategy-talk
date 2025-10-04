using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class ParagraphVersion
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ParagraphId { get; set; }

    [Required]
    public int Version { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public ParagraphType Type { get; set; } = ParagraphType.Text;

    [Required]
    public Guid UpdatedByProfileId { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ParagraphId))]
    public Paragraph Paragraph { get; set; } = null!;

    [ForeignKey(nameof(UpdatedByProfileId))]
    public Profile UpdatedByProfile { get; set; } = null!;
}
