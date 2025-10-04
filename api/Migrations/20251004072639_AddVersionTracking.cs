using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddVersionTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Paragraphs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByProfileId",
                table: "Paragraphs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedByProfileId",
                table: "Pages",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PageVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ParagraphsSnapshot = table.Column<string>(type: "text", nullable: false),
                    ChangeDescription = table.Column<string>(type: "text", nullable: true),
                    UpdatedByProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PageVersions_Pages_PageId",
                        column: x => x.PageId,
                        principalTable: "Pages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PageVersions_Profiles_UpdatedByProfileId",
                        column: x => x.UpdatedByProfileId,
                        principalTable: "Profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ParagraphVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParagraphId = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    UpdatedByProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParagraphVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParagraphVersions_Paragraphs_ParagraphId",
                        column: x => x.ParagraphId,
                        principalTable: "Paragraphs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParagraphVersions_Profiles_UpdatedByProfileId",
                        column: x => x.UpdatedByProfileId,
                        principalTable: "Profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Paragraphs_UpdatedByProfileId",
                table: "Paragraphs",
                column: "UpdatedByProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_UpdatedByProfileId",
                table: "Pages",
                column: "UpdatedByProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_PageVersions_PageId_Version",
                table: "PageVersions",
                columns: new[] { "PageId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PageVersions_UpdatedAt",
                table: "PageVersions",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PageVersions_UpdatedByProfileId",
                table: "PageVersions",
                column: "UpdatedByProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphVersions_ParagraphId_Version",
                table: "ParagraphVersions",
                columns: new[] { "ParagraphId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphVersions_UpdatedAt",
                table: "ParagraphVersions",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphVersions_UpdatedByProfileId",
                table: "ParagraphVersions",
                column: "UpdatedByProfileId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pages_Profiles_UpdatedByProfileId",
                table: "Pages",
                column: "UpdatedByProfileId",
                principalTable: "Profiles",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Paragraphs_Profiles_UpdatedByProfileId",
                table: "Paragraphs",
                column: "UpdatedByProfileId",
                principalTable: "Profiles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pages_Profiles_UpdatedByProfileId",
                table: "Pages");

            migrationBuilder.DropForeignKey(
                name: "FK_Paragraphs_Profiles_UpdatedByProfileId",
                table: "Paragraphs");

            migrationBuilder.DropTable(
                name: "PageVersions");

            migrationBuilder.DropTable(
                name: "ParagraphVersions");

            migrationBuilder.DropIndex(
                name: "IX_Paragraphs_UpdatedByProfileId",
                table: "Paragraphs");

            migrationBuilder.DropIndex(
                name: "IX_Pages_UpdatedByProfileId",
                table: "Pages");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Paragraphs");

            migrationBuilder.DropColumn(
                name: "UpdatedByProfileId",
                table: "Paragraphs");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Pages");

            migrationBuilder.DropColumn(
                name: "UpdatedByProfileId",
                table: "Pages");
        }
    }
}
