using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrsQuotes.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotePhotoArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ArchivedPhotoCount",
                table: "Quotes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PhotoArchiveUrl",
                table: "Quotes",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PhotosPurgedAt",
                table: "Quotes",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArchivedPhotoCount",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "PhotoArchiveUrl",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "PhotosPurgedAt",
                table: "Quotes");
        }
    }
}
