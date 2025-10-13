using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddParagraphSuggestionSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SuggestionId",
                table: "Comments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ParagraphSuggestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParagraphId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SuggestedContent = table.Column<string>(type: "text", nullable: false),
                    Comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParagraphSuggestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParagraphSuggestions_Paragraphs_ParagraphId",
                        column: x => x.ParagraphId,
                        principalTable: "Paragraphs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParagraphSuggestions_Profiles_UserId",
                        column: x => x.UserId,
                        principalTable: "Profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SuggestionVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SuggestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VoteType = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SuggestionVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SuggestionVotes_ParagraphSuggestions_SuggestionId",
                        column: x => x.SuggestionId,
                        principalTable: "ParagraphSuggestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SuggestionVotes_Profiles_UserId",
                        column: x => x.UserId,
                        principalTable: "Profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_SuggestionId",
                table: "Comments",
                column: "SuggestionId");

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_CreatedAt",
                table: "ParagraphSuggestions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_ParagraphId",
                table: "ParagraphSuggestions",
                column: "ParagraphId");

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_ParagraphId_Status",
                table: "ParagraphSuggestions",
                columns: new[] { "ParagraphId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_Status",
                table: "ParagraphSuggestions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_UserId",
                table: "ParagraphSuggestions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SuggestionVotes_SuggestionId_UserId",
                table: "SuggestionVotes",
                columns: new[] { "SuggestionId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SuggestionVotes_UserId",
                table: "SuggestionVotes",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Comments_ParagraphSuggestions_SuggestionId",
                table: "Comments",
                column: "SuggestionId",
                principalTable: "ParagraphSuggestions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Comments_ParagraphSuggestions_SuggestionId",
                table: "Comments");

            migrationBuilder.DropTable(
                name: "SuggestionVotes");

            migrationBuilder.DropTable(
                name: "ParagraphSuggestions");

            migrationBuilder.DropIndex(
                name: "IX_Comments_SuggestionId",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "SuggestionId",
                table: "Comments");
        }
    }
}
