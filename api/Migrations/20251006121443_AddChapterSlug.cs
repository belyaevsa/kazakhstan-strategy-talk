using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddChapterSlug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add the Slug column as nullable first
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Chapters",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            // Populate existing chapters with their ID as slug
            migrationBuilder.Sql(@"
                UPDATE ""Chapters""
                SET ""Slug"" = CAST(""Id"" AS TEXT)
                WHERE ""Slug"" IS NULL OR ""Slug"" = '';
            ");

            // Make the column non-nullable
            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                table: "Chapters",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Chapters");
        }
    }
}
