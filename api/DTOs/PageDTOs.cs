using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.DTOs;

public class PageDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public bool IsDraft { get; set; }
    public Guid ChapterId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByUsername { get; set; }
}

public class CreatePageRequest
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    [MaxLength(255)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    public int OrderIndex { get; set; }

    [Required]
    public Guid ChapterId { get; set; }
}

public class UpdatePageRequest
{
    [MaxLength(255)]
    public string? Title { get; set; }

    public string? Description { get; set; }

    [MaxLength(255)]
    public string? Slug { get; set; }

    public int? OrderIndex { get; set; }

    public bool? IsDraft { get; set; }

    public Guid? ChapterId { get; set; }
}
