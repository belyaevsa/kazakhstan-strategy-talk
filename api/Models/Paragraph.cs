using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class Paragraph
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    public int OrderIndex { get; set; }

    public int CommentCount { get; set; } = 0;

    public bool IsHidden { get; set; } = false;

    public ParagraphType Type { get; set; } = ParagraphType.Text;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Foreign keys
    [Required]
    public Guid PageId { get; set; }

    // Navigation properties
    [ForeignKey(nameof(PageId))]
    public Page Page { get; set; } = null!;

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
