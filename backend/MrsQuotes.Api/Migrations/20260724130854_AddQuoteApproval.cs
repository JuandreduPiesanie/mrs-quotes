using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrsQuotes.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "Quotes",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "Quotes");
        }
    }
}
