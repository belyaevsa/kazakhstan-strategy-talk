using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models
{
    public enum SuggestionStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public class ParagraphSuggestion
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid ParagraphId { get; set; }

        [ForeignKey("ParagraphId")]
        public Paragraph? Paragraph { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public Profile? User { get; set; }

        [Required]
        public string SuggestedContent { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Comment { get; set; } = string.Empty;

        [Required]
        public SuggestionStatus Status { get; set; } = SuggestionStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Soft delete fields
        public bool IsDeleted { get; set; } = false;

        public DateTime? DeletedAt { get; set; }

        public Guid? DeletedByUserId { get; set; }

        [ForeignKey("DeletedByUserId")]
        public Profile? DeletedByUser { get; set; }

        // Audit/Logging fields
        [MaxLength(45)]
        public string? CreatedIpAddress { get; set; }

        [MaxLength(500)]
        public string? CreatedUserAgent { get; set; }

        [MaxLength(45)]
        public string? UpdatedIpAddress { get; set; }

        [MaxLength(500)]
        public string? UpdatedUserAgent { get; set; }

        // Approval/Rejection metadata
        public Guid? ApprovedByUserId { get; set; }

        [ForeignKey("ApprovedByUserId")]
        public Profile? ApprovedByUser { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public Guid? RejectedByUserId { get; set; }

        [ForeignKey("RejectedByUserId")]
        public Profile? RejectedByUser { get; set; }

        public DateTime? RejectedAt { get; set; }

        // Navigation properties
        public ICollection<SuggestionVote> Votes { get; set; } = new List<SuggestionVote>();
        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    }
}
