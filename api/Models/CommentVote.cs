using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class CommentVote
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string VoteType { get; set; } = string.Empty; // "agree" or "disagree"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Foreign keys
    [Required]
    public Guid CommentId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    // Navigation properties
    [ForeignKey(nameof(CommentId))]
    public Comment Comment { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public Profile User { get; set; } = null!;
}
