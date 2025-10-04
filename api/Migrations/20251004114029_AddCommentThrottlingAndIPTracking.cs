using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentThrottlingAndIPTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FrozenUntil",
                table: "Profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastCommentAt",
                table: "Profiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "Comments",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FrozenUntil",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "LastCommentAt",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "Comments");
        }
    }
}
