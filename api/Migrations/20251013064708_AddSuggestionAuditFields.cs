using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSuggestionAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "ParagraphSuggestions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedByUserId",
                table: "ParagraphSuggestions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedIpAddress",
                table: "ParagraphSuggestions",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedUserAgent",
                table: "ParagraphSuggestions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAt",
                table: "ParagraphSuggestions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RejectedByUserId",
                table: "ParagraphSuggestions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedIpAddress",
                table: "ParagraphSuggestions",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedUserAgent",
                table: "ParagraphSuggestions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_ApprovedByUserId",
                table: "ParagraphSuggestions",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ParagraphSuggestions_RejectedByUserId",
                table: "ParagraphSuggestions",
                column: "RejectedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ParagraphSuggestions_Profiles_ApprovedByUserId",
                table: "ParagraphSuggestions",
                column: "ApprovedByUserId",
                principalTable: "Profiles",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ParagraphSuggestions_Profiles_RejectedByUserId",
                table: "ParagraphSuggestions",
                column: "RejectedByUserId",
                principalTable: "Profiles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParagraphSuggestions_Profiles_ApprovedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropForeignKey(
                name: "FK_ParagraphSuggestions_Profiles_RejectedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropIndex(
                name: "IX_ParagraphSuggestions_ApprovedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropIndex(
                name: "IX_ParagraphSuggestions_RejectedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "CreatedIpAddress",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "CreatedUserAgent",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "RejectedAt",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "RejectedByUserId",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "UpdatedIpAddress",
                table: "ParagraphSuggestions");

            migrationBuilder.DropColumn(
                name: "UpdatedUserAgent",
                table: "ParagraphSuggestions");
        }
    }
}
