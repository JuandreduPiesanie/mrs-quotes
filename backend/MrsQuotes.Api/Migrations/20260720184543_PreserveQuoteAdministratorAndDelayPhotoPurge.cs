using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrsQuotes.Api.Migrations
{
    /// <inheritdoc />
    public partial class PreserveQuoteAdministratorAndDelayPhotoPurge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PhotoPurgeEligibleAt",
                table: "Quotes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuoteAdministratorId",
                table: "Quotes",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE quote
                SET quote.QuoteAdministratorId = assessor.QuoteAdministratorId
                FROM Quotes AS quote
                INNER JOIN Users AS assessor ON assessor.Id = quote.AssessorId;
                """);

            migrationBuilder.Sql(
                """
                UPDATE Quotes
                SET PhotoPurgeEligibleAt = DATEADD(hour, 48, COALESCE(CompletedAt, SYSUTCDATETIME()))
                WHERE Status = 'completed'
                  AND PhotoArchiveUrl IS NOT NULL
                  AND PhotosPurgedAt IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_QuoteAdministratorId",
                table: "Quotes",
                column: "QuoteAdministratorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Quotes_Users_QuoteAdministratorId",
                table: "Quotes",
                column: "QuoteAdministratorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Quotes_Users_QuoteAdministratorId",
                table: "Quotes");

            migrationBuilder.DropIndex(
                name: "IX_Quotes_QuoteAdministratorId",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "PhotoPurgeEligibleAt",
                table: "Quotes");

            migrationBuilder.DropColumn(
                name: "QuoteAdministratorId",
                table: "Quotes");
        }
    }
}
