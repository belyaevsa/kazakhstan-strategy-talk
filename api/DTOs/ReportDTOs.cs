using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.DTOs;

public class CreateReportRequest
{
    [Required]
    [RegularExpression("^(Comment|Suggestion)$", ErrorMessage = "ContentType must be Comment or Suggestion")]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    public Guid ContentId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Details { get; set; }
}

public class ResolveReportRequest
{
    [Required]
    [RegularExpression("^(Reviewed|Dismissed)$", ErrorMessage = "Action must be Reviewed or Dismissed")]
    public string Action { get; set; } = string.Empty;
}

public class ReportDTO
{
    public Guid Id { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public Guid ContentId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid ReporterProfileId { get; set; }
    public string? ReporterUsername { get; set; }
    public string? ContentPreview { get; set; }
}
