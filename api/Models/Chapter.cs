using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.Models;

public class Chapter
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    [MaxLength(255)]
    public string Slug { get; set; } = string.Empty;

    public string? Icon { get; set; }

    public int OrderIndex { get; set; }

    public bool IsDraft { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<Page> Pages { get; set; } = new List<Page>();
}
