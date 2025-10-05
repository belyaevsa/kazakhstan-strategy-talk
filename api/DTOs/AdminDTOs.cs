namespace KazakhstanStrategyApi.DTOs;

public class AdminUserDTO
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastCommentAt { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public DateTime? FrozenUntil { get; set; }
    public bool IsBlocked { get; set; }
    public string? RegistrationIp { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class AdminCommentDTO
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorEmail { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? PageTitle { get; set; }
    public string? PageSlug { get; set; }
    public Guid? PageId { get; set; }
    public Guid? ParagraphId { get; set; }
    public string? IpAddress { get; set; }
    public bool IsDeleted { get; set; }
}

public class FreezeUserRequest
{
    public DateTime FreezeUntil { get; set; }
}

public class AdminSettingDTO
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateSettingRequest
{
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}
