using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrsQuotes.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuoteItemLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "QuoteItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "Unspecified");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Location",
                table: "QuoteItems");
        }
    }
}
