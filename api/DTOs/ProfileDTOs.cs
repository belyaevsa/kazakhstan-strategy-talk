using System.ComponentModel.DataAnnotations;

namespace KazakhstanStrategyApi.DTOs;

public class PublicProfileDTO
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Email { get; set; } // Only shown if ShowEmail is true
    public DateTime CreatedAt { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public int TotalComments { get; set; }
    public int TotalVotesReceived { get; set; }

    // Settings (only included when viewing own profile)
    public bool? ShowEmail { get; set; }
    public bool? EmailNotifications { get; set; }
    public string? TimeZone { get; set; }
}

public class ProfileStatsDTO
{
    public List<CommentWithContextDTO> LatestComments { get; set; } = new();
    public CommentWithContextDTO? MostPopularComment { get; set; }
    public List<ActiveDiscussionDTO> ActiveDiscussions { get; set; } = new();
}

public class CommentWithContextDTO
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int VoteScore { get; set; }
    public Guid PageId { get; set; }
    public string PageTitle { get; set; } = string.Empty;
    public string PageSlug { get; set; } = string.Empty;
    public Guid? ParagraphId { get; set; }
}

public class ActiveDiscussionDTO
{
    public Guid PageId { get; set; }
    public string PageTitle { get; set; } = string.Empty;
    public string PageSlug { get; set; } = string.Empty;
    public int CommentCount { get; set; }
    public DateTime LastCommentAt { get; set; }
}

public class UpdateProfileRequest
{
    [MaxLength(100)]
    public string? DisplayName { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    public bool? ShowEmail { get; set; }
    public bool? EmailNotifications { get; set; }

    [MaxLength(50)]
    public string? TimeZone { get; set; }
}
