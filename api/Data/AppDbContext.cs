using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Profile> Profiles { get; set; }
    public DbSet<ProfileRole> ProfileRoles { get; set; }
    public DbSet<Chapter> Chapters { get; set; }
    public DbSet<Page> Pages { get; set; }
    public DbSet<Paragraph> Paragraphs { get; set; }
    public DbSet<Comment> Comments { get; set; }
    public DbSet<CommentVote> CommentVotes { get; set; }
    public DbSet<PageVersion> PageVersions { get; set; }
    public DbSet<ParagraphVersion> ParagraphVersions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Profile configuration
        modelBuilder.Entity<Profile>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Username);
        });

        // ProfileRole configuration
        modelBuilder.Entity<ProfileRole>(entity =>
        {
            entity.HasOne(pr => pr.Profile)
                .WithMany(p => p.ProfileRoles)
                .HasForeignKey(pr => pr.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            // One user can have one instance of each role
            entity.HasIndex(e => new { e.ProfileId, e.Role }).IsUnique();
        });

        // Chapter configuration
        modelBuilder.Entity<Chapter>(entity =>
        {
            entity.HasIndex(e => e.OrderIndex);
        });

        // Page configuration
        modelBuilder.Entity<Page>(entity =>
        {
            entity.HasOne(p => p.Chapter)
                .WithMany(c => c.Pages)
                .HasForeignKey(p => p.ChapterId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => new { e.ChapterId, e.OrderIndex });
        });

        // Paragraph configuration
        modelBuilder.Entity<Paragraph>(entity =>
        {
            entity.HasOne(p => p.Page)
                .WithMany(page => page.Paragraphs)
                .HasForeignKey(p => p.PageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.PageId, e.OrderIndex });
        });

        // Comment configuration
        modelBuilder.Entity<Comment>(entity =>
        {
            entity.HasOne(c => c.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Page)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.PageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Paragraph)
                .WithMany(p => p.Comments)
                .HasForeignKey(c => c.ParagraphId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Parent)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.PageId);
            entity.HasIndex(e => e.ParagraphId);
            entity.HasIndex(e => e.ParentId);
            entity.HasIndex(e => e.CreatedAt);
        });

        // CommentVote configuration
        modelBuilder.Entity<CommentVote>(entity =>
        {
            entity.HasOne(cv => cv.Comment)
                .WithMany(c => c.Votes)
                .HasForeignKey(cv => cv.CommentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cv => cv.User)
                .WithMany(u => u.CommentVotes)
                .HasForeignKey(cv => cv.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ensure one vote per user per comment
            entity.HasIndex(e => new { e.CommentId, e.UserId }).IsUnique();
        });

        // PageVersion configuration
        modelBuilder.Entity<PageVersion>(entity =>
        {
            entity.HasOne(pv => pv.Page)
                .WithMany()
                .HasForeignKey(pv => pv.PageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pv => pv.UpdatedByProfile)
                .WithMany()
                .HasForeignKey(pv => pv.UpdatedByProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PageId, e.Version }).IsUnique();
            entity.HasIndex(e => e.UpdatedAt);
        });

        // ParagraphVersion configuration
        modelBuilder.Entity<ParagraphVersion>(entity =>
        {
            entity.HasOne(pv => pv.Paragraph)
                .WithMany()
                .HasForeignKey(pv => pv.ParagraphId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pv => pv.UpdatedByProfile)
                .WithMany()
                .HasForeignKey(pv => pv.UpdatedByProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.ParagraphId, e.Version }).IsUnique();
            entity.HasIndex(e => e.UpdatedAt);
        });
    }
}
