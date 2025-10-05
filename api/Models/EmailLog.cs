using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.Models;

public class EmailLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public string ToEmail { get; set; } = string.Empty;

    [Required]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Body { get; set; } = string.Empty;

    public string? FromEmail { get; set; }

    public string? FromName { get; set; }

    public string EmailType { get; set; } = string.Empty; // e.g., "EmailVerification", "PasswordReset", etc.

    public bool IsSent { get; set; } = false;

    public string? ErrorMessage { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
