using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models
{
    public enum VoteType
    {
        Upvote = 1,
        Downvote = -1
    }

    public class SuggestionVote
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid SuggestionId { get; set; }

        [ForeignKey("SuggestionId")]
        public ParagraphSuggestion? Suggestion { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public Profile? User { get; set; }

        [Required]
        public VoteType VoteType { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
