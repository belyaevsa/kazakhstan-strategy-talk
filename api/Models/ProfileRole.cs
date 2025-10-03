using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace KazakhstanStrategyApi.Models;

public class ProfileRole
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ProfileId { get; set; }

    [Required]
    public UserRole Role { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ProfileId))]
    public Profile Profile { get; set; } = null!;
}
