using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIsVisibleOnMainPageToChapter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVisibleOnMainPage",
                table: "Chapters",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsVisibleOnMainPage",
                table: "Chapters");
        }
    }
}
