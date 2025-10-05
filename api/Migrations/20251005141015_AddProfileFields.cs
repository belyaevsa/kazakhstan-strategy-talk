using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KazakhstanStrategyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "Profiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "Profiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailNotifications",
                table: "Profiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowEmail",
                table: "Profiles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TimeZone",
                table: "Profiles",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bio",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "EmailNotifications",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "ShowEmail",
                table: "Profiles");

            migrationBuilder.DropColumn(
                name: "TimeZone",
                table: "Profiles");
        }
    }
}
