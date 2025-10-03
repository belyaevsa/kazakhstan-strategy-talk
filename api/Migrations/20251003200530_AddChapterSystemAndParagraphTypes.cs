using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddChapterSystemAndParagraphTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Pages_OrderIndex",
                table: "Pages");

            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "Paragraphs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Paragraphs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ChapterId",
                table: "Pages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Chapters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    IsDraft = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Chapters", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pages_ChapterId_OrderIndex",
                table: "Pages",
                columns: new[] { "ChapterId", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_OrderIndex",
                table: "Chapters",
                column: "OrderIndex");

            migrationBuilder.AddForeignKey(
                name: "FK_Pages_Chapters_ChapterId",
                table: "Pages",
                column: "ChapterId",
                principalTable: "Chapters",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pages_Chapters_ChapterId",
                table: "Pages");

            migrationBuilder.DropTable(
                name: "Chapters");

            migrationBuilder.DropIndex(
                name: "IX_Pages_ChapterId_OrderIndex",
                table: "Pages");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "Paragraphs");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Paragraphs");

            migrationBuilder.DropColumn(
                name: "ChapterId",
                table: "Pages");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_OrderIndex",
                table: "Pages",
                column: "OrderIndex");
        }
    }
}
