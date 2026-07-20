using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database.Models;

namespace MrsQuotes.Api.Database;

public sealed class MrsQuotesDbContext(DbContextOptions<MrsQuotesDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<PriceItem> PriceItems => Set<PriceItem>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<QuoteItem> QuoteItems => Set<QuoteItem>();
    public DbSet<QuotePhoto> QuotePhotos => Set<QuotePhoto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Role);
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.PasswordHash).HasMaxLength(500);
            entity.Property(x => x.Role).HasMaxLength(40);
            entity.HasOne(x => x.QuoteAdministrator)
                .WithMany(x => x.AssignedAssessors)
                .HasForeignKey(x => x.QuoteAdministratorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasIndex(x => x.Name).IsUnique();
            entity.HasIndex(x => x.Active);
            entity.Property(x => x.Name).HasMaxLength(300);
        });

        modelBuilder.Entity<PriceItem>(entity =>
        {
            entity.HasIndex(x => new { x.Active, x.QuoteGroup });
            entity.Property(x => x.Section).HasMaxLength(150);
            entity.Property(x => x.Category).HasMaxLength(150);
            entity.Property(x => x.QuoteGroup).HasMaxLength(150);
            entity.Property(x => x.ItemCode).HasMaxLength(100);
            entity.Property(x => x.Description).HasMaxLength(1000);
            entity.Property(x => x.Unit).HasMaxLength(80);
            entity.Property(x => x.Rate).HasColumnType("decimal(18,2)");
            entity.Property(x => x.SourceSheet).HasMaxLength(200);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasIndex(x => new { x.AssessorId, x.Status, x.AppointmentStart });
            entity.Property(x => x.CustomerName).HasMaxLength(300);
            entity.Property(x => x.SiteAddress).HasMaxLength(1000);
            entity.Property(x => x.RequestDetails).HasMaxLength(4000);
            entity.Property(x => x.Status).HasMaxLength(40);
            entity.HasOne(x => x.Assessor).WithMany(x => x.Appointments)
                .HasForeignKey(x => x.AssessorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Client).WithMany(x => x.Appointments)
                .HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Quote>(entity =>
        {
            entity.HasIndex(x => x.QuoteNumber).IsUnique();
            entity.HasIndex(x => new { x.Status, x.CreatedAt });
            entity.HasIndex(x => x.AppointmentId).IsUnique().HasFilter("[AppointmentId] IS NOT NULL");
            entity.Property(x => x.QuoteNumber).HasMaxLength(40);
            entity.Property(x => x.CustomerName).HasMaxLength(300);
            entity.Property(x => x.SiteAddress).HasMaxLength(1000);
            entity.Property(x => x.RequestDetails).HasMaxLength(4000);
            entity.Property(x => x.Status).HasMaxLength(40);
            entity.Property(x => x.Subtotal).HasColumnType("decimal(18,2)");
            entity.Property(x => x.ErpQuoteNumber).HasMaxLength(150);
            entity.Property(x => x.PhotoArchiveUrl).HasMaxLength(2048);
            entity.HasOne(x => x.Assessor).WithMany(x => x.Quotes)
                .HasForeignKey(x => x.AssessorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.QuoteAdministrator).WithMany()
                .HasForeignKey(x => x.QuoteAdministratorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Appointment).WithOne(x => x.Quote)
                .HasForeignKey<Quote>(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Client).WithMany(x => x.Quotes)
                .HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<QuoteItem>(entity =>
        {
            entity.Property(x => x.Description).HasMaxLength(1000);
            entity.Property(x => x.Unit).HasMaxLength(80);
            entity.Property(x => x.Quantity).HasColumnType("decimal(18,3)");
            entity.Property(x => x.UnitRate).HasColumnType("decimal(18,2)");
            entity.Property(x => x.LineTotal).HasColumnType("decimal(18,2)");
            entity.HasOne(x => x.Quote).WithMany(x => x.Items)
                .HasForeignKey(x => x.QuoteId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.PriceItem).WithMany(x => x.QuoteItems)
                .HasForeignKey(x => x.PriceItemId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<QuotePhoto>(entity =>
        {
            entity.Property(x => x.OriginalName).HasMaxLength(500);
            entity.Property(x => x.FileName).HasMaxLength(500);
            entity.Property(x => x.MimeType).HasMaxLength(150);
            entity.HasOne(x => x.Quote).WithMany(x => x.Photos)
                .HasForeignKey(x => x.QuoteId).OnDelete(DeleteBehavior.Cascade);
        });

        var seedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        modelBuilder.Entity<PriceItem>().HasData(
            new PriceItem { Id = 1, Section = "Starter", Category = "Emergency Work", QuoteGroup = "Emergency", ItemCode = "MRS-001", Description = "Initial site inspection and quick make-safe allowance", Unit = "Each", Rate = 850m, SourceSheet = "Starter", CreatedAt = seedDate },
            new PriceItem { Id = 2, Section = "Starter", Category = "Building Work", QuoteGroup = "Building", ItemCode = "MRS-002", Description = "Replace damaged ceiling board", Unit = "m2", Rate = 420m, SourceSheet = "Starter", CreatedAt = seedDate },
            new PriceItem { Id = 3, Section = "Starter", Category = "Painting", QuoteGroup = "Building", ItemCode = "MRS-003", Description = "Prepare and paint interior wall", Unit = "m2", Rate = 95m, SourceSheet = "Starter", CreatedAt = seedDate },
            new PriceItem { Id = 4, Section = "Starter", Category = "Waterproofing", QuoteGroup = "Roofing", ItemCode = "MRS-004", Description = "Torch-on waterproofing repair", Unit = "m2", Rate = 310m, SourceSheet = "Starter", CreatedAt = seedDate },
            new PriceItem { Id = 5, Section = "Starter", Category = "Cleaning", QuoteGroup = "Building", ItemCode = "MRS-005", Description = "Post-repair cleaning crew", Unit = "Hour", Rate = 280m, SourceSheet = "Starter", CreatedAt = seedDate });
    }
}
