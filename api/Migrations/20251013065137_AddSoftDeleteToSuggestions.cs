using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteToSuggestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "ParagraphSuggestions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                table: "ParagraphSuggestions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "ParagraphSuggestions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_DeletedByUserId",
                table: "ParagraphSuggestions",
                column: "DeletedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ParagraphSuggestions_Profiles_DeletedByUserId",
                table: "ParagraphSuggestions",
                column: "DeletedByUserId",
                principalTable: "Profiles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParagraphSuggestions_Profiles_DeletedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropIndex(
                name: "IX_ParagraphSuggestions_DeletedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "ParagraphSuggestions");
        }
    }
}
