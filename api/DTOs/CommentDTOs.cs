using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.DTOs;

public class CommentDTO
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public int AgreeCount { get; set; }
    public int DisagreeCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; }
    public UserDTO User { get; set; } = null!;
    public Guid? ParentId { get; set; }
    public List<CommentDTO> Replies { get; set; } = new();
}

public class CreateCommentRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;

    public Guid? PageId { get; set; }
    public Guid? ParagraphId { get; set; }
    public Guid? ParentId { get; set; }
    public Guid? SuggestionId { get; set; }
}

public class UpdateCommentRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;
}

public class VoteRequest
{
    [Required]
    [RegularExpression("^(agree|disagree)$")]
    public string VoteType { get; set; } = string.Empty;
}
