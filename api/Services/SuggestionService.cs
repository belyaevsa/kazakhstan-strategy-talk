using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Services;

public class SuggestionService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    public SuggestionService(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<ParagraphSuggestion> CreateSuggestionAsync(
        Guid paragraphId,
        Guid userId,
        string suggestedContent,
        string comment,
        string? ipAddress = null,
        string? userAgent = null)
    {
        var paragraph = await _context.Paragraphs
            .Include(p => p.Page)
            .FirstOrDefaultAsync(p => p.Id == paragraphId);

        if (paragraph == null)
        {
            throw new ArgumentException("Paragraph not found");
        }

        var suggestion = new ParagraphSuggestion
        {
            Id = Guid.NewGuid(),
            ParagraphId = paragraphId,
            UserId = userId,
            SuggestedContent = suggestedContent,
            Comment = comment,
            Status = SuggestionStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedIpAddress = ipAddress,
            CreatedUserAgent = userAgent
        };

        _context.ParagraphSuggestions.Add(suggestion);
        await _context.SaveChangesAsync();

        // TODO: Notify admins about new suggestion
        // This could be added later when we have admin notification preferences

        return suggestion;
    }

    public async Task<List<ParagraphSuggestion>> GetSuggestionsByParagraphAsync(Guid paragraphId)
    {
        return await _context.ParagraphSuggestions
            .Include(s => s.User)
            .Include(s => s.Votes)
            .Include(s => s.Comments)
                .ThenInclude(c => c.User)
            .Where(s => s.ParagraphId == paragraphId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<ParagraphSuggestion?> GetSuggestionByIdAsync(Guid suggestionId)
    {
        return await _context.ParagraphSuggestions
            .Include(s => s.User)
            .Include(s => s.Paragraph)
                .ThenInclude(p => p.Page)
            .Include(s => s.Votes)
                .ThenInclude(v => v.User)
            .Include(s => s.Comments)
                .ThenInclude(c => c.User)
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(s => s.Id == suggestionId);
    }

    public async Task<ParagraphSuggestion> UpdateSuggestionAsync(
        Guid suggestionId,
        Guid userId,
        string suggestedContent,
        string comment,
        string? ipAddress = null,
        string? userAgent = null)
    {
        var suggestion = await _context.ParagraphSuggestions
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(s => s.Id == suggestionId);

        if (suggestion == null)
        {
            throw new ArgumentException("Suggestion not found");
        }

        if (suggestion.UserId != userId)
        {
            throw new UnauthorizedAccessException("Only the author can update this suggestion");
        }

        if (suggestion.Status != SuggestionStatus.Pending)
        {
            throw new InvalidOperationException("Only pending suggestions can be updated");
        }

        suggestion.SuggestedContent = suggestedContent;
        suggestion.Comment = comment;
        suggestion.UpdatedAt = DateTime.UtcNow;
        suggestion.UpdatedIpAddress = ipAddress;
        suggestion.UpdatedUserAgent = userAgent;

        await _context.SaveChangesAsync();

        return suggestion;
    }

    public async Task<bool> DeleteSuggestionAsync(Guid suggestionId, Guid userId, bool isAdmin)
    {
        var suggestion = await _context.ParagraphSuggestions
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(s => s.Id == suggestionId);

        if (suggestion == null)
        {
            return false;
        }

        // Only the author or admin can delete
        if (suggestion.UserId != userId && !isAdmin)
        {
            throw new UnauthorizedAccessException("You don't have permission to delete this suggestion");
        }

        // Soft delete - mark as deleted instead of removing
        suggestion.IsDeleted = true;
        suggestion.DeletedAt = DateTime.UtcNow;
        suggestion.DeletedByUserId = userId;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<ParagraphSuggestion> ApproveSuggestionAsync(Guid suggestionId, Guid adminId)
    {
        var suggestion = await _context.ParagraphSuggestions
            .Include(s => s.Paragraph)
                .ThenInclude(p => p.Page)
            .Include(s => s.User)
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(s => s.Id == suggestionId);

        if (suggestion == null)
        {
            throw new ArgumentException("Suggestion not found");
        }

        if (suggestion.Status != SuggestionStatus.Pending)
        {
            throw new InvalidOperationException("Only pending suggestions can be approved");
        }

        // Update the paragraph content
        suggestion.Paragraph!.Content = suggestion.SuggestedContent;
        suggestion.Paragraph.UpdatedAt = DateTime.UtcNow;

        // Mark suggestion as approved
        suggestion.Status = SuggestionStatus.Approved;
        suggestion.UpdatedAt = DateTime.UtcNow;
        suggestion.ApprovedByUserId = adminId;
        suggestion.ApprovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Notify the suggestion author about approval
        await _notificationService.NotifySuggestionApprovedAsync(
            suggestion.UserId,
            suggestion.Paragraph.Page!.Id,
            suggestion.Paragraph.Page.Slug,
            suggestion.Paragraph.Page.Title,
            adminId
        );

        return suggestion;
    }

    public async Task<ParagraphSuggestion> RejectSuggestionAsync(Guid suggestionId, Guid rejectedByUserId)
    {
        var suggestion = await _context.ParagraphSuggestions
            .Where(s => !s.IsDeleted)
            .FirstOrDefaultAsync(s => s.Id == suggestionId);

        if (suggestion == null)
        {
            throw new ArgumentException("Suggestion not found");
        }

        if (suggestion.Status != SuggestionStatus.Pending)
        {
            throw new InvalidOperationException("Only pending suggestions can be rejected");
        }

        suggestion.Status = SuggestionStatus.Rejected;
        suggestion.UpdatedAt = DateTime.UtcNow;
        suggestion.RejectedByUserId = rejectedByUserId;
        suggestion.RejectedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return suggestion;
    }

    public async Task<SuggestionVote?> VoteOnSuggestionAsync(Guid suggestionId, Guid userId, VoteType voteType)
    {
        // Check if user already voted
        var existingVote = await _context.SuggestionVotes
            .FirstOrDefaultAsync(v => v.SuggestionId == suggestionId && v.UserId == userId);

        if (existingVote != null)
        {
            // If same vote type, remove the vote (toggle)
            if (existingVote.VoteType == voteType)
            {
                _context.SuggestionVotes.Remove(existingVote);
                await _context.SaveChangesAsync();
                return null;
            }
            else
            {
                // Change vote type
                existingVote.VoteType = voteType;
                existingVote.CreatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return existingVote;
            }
        }

        // Create new vote
        var vote = new SuggestionVote
        {
            Id = Guid.NewGuid(),
            SuggestionId = suggestionId,
            UserId = userId,
            VoteType = voteType,
            CreatedAt = DateTime.UtcNow
        };

        _context.SuggestionVotes.Add(vote);
        await _context.SaveChangesAsync();

        return vote;
    }

    public async Task<(int upvotes, int downvotes)> GetVoteCountsAsync(Guid suggestionId)
    {
        var votes = await _context.SuggestionVotes
            .Where(v => v.SuggestionId == suggestionId)
            .ToListAsync();

        var upvotes = votes.Count(v => v.VoteType == VoteType.Upvote);
        var downvotes = votes.Count(v => v.VoteType == VoteType.Downvote);

        return (upvotes, downvotes);
    }

    public async Task<VoteType?> GetUserVoteAsync(Guid suggestionId, Guid userId)
    {
        var vote = await _context.SuggestionVotes
            .FirstOrDefaultAsync(v => v.SuggestionId == suggestionId && v.UserId == userId);

        return vote?.VoteType;
    }
}
