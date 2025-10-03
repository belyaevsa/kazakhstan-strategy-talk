namespace KazakhstanStrategyApi.DTOs;

public class ChapterDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; }
    public bool IsDraft { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<PageDTO> Pages { get; set; } = new();
}

public class CreateChapterRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; }
    public bool IsDraft { get; set; } = true;
}

public class UpdateChapterRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? OrderIndex { get; set; }
    public bool? IsDraft { get; set; }
}

public class ReorderRequest
{
    public int NewOrderIndex { get; set; }
}
