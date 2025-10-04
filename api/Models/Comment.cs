using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class Comment
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public int AgreeCount { get; set; } = 0;

    public int DisagreeCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public bool IsDeleted { get; set; } = false;

    public DateTime? DeletedAt { get; set; }

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    // Foreign keys
    [Required]
    public Guid UserId { get; set; }

    public Guid? PageId { get; set; }

    public Guid? ParagraphId { get; set; }

    public Guid? ParentId { get; set; }

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public Profile User { get; set; } = null!;

    [ForeignKey(nameof(PageId))]
    public Page? Page { get; set; }

    [ForeignKey(nameof(ParagraphId))]
    public Paragraph? Paragraph { get; set; }

    [ForeignKey(nameof(ParentId))]
    public Comment? Parent { get; set; }

    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
    public ICollection<CommentVote> Votes { get; set; } = new List<CommentVote>();
}
