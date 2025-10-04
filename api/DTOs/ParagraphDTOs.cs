using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.DTOs;

public class ParagraphDTO
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public int CommentCount { get; set; }
    public bool IsHidden { get; set; }
    public string Type { get; set; } = "Text";
    public Guid PageId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByUsername { get; set; }
}

public class CreateParagraphRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    public int OrderIndex { get; set; }

    [Required]
    public Guid PageId { get; set; }

    public string Type { get; set; } = "Text";
}

public class UpdateParagraphRequest
{
    public string? Content { get; set; }
    public int? OrderIndex { get; set; }
    public bool? IsHidden { get; set; }
    public string? Type { get; set; }
}
