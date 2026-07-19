using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MrsQuotes.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clients",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Active = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PriceItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Section = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    QuoteGroup = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ItemCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Active = table.Column<bool>(type: "bit", nullable: false),
                    SourceSheet = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    QuoteAdministratorId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Users_QuoteAdministratorId",
                        column: x => x.QuoteAdministratorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssessorId = table.Column<int>(type: "int", nullable: false),
                    ClientId = table.Column<int>(type: "int", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    SiteAddress = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RequestDetails = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    AppointmentStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AppointmentEnd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appointments_Users_AssessorId",
                        column: x => x.AssessorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Quotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssessorId = table.Column<int>(type: "int", nullable: false),
                    AppointmentId = table.Column<int>(type: "int", nullable: true),
                    ClientId = table.Column<int>(type: "int", nullable: true),
                    QuoteNumber = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    SiteAddress = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RequestDetails = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ErpQuoteNumber = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Quotes_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Quotes_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Quotes_Users_AssessorId",
                        column: x => x.AssessorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuoteItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuoteId = table.Column<int>(type: "int", nullable: false),
                    PriceItemId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,3)", nullable: false),
                    UnitRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LineTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuoteItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuoteItems_PriceItems_PriceItemId",
                        column: x => x.PriceItemId,
                        principalTable: "PriceItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuoteItems_Quotes_QuoteId",
                        column: x => x.QuoteId,
                        principalTable: "Quotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuotePhotos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuoteId = table.Column<int>(type: "int", nullable: false),
                    OriginalName = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    MimeType = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuotePhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuotePhotos_Quotes_QuoteId",
                        column: x => x.QuoteId,
                        principalTable: "Quotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "PriceItems",
                columns: new[] { "Id", "Active", "Category", "CreatedAt", "Description", "ItemCode", "QuoteGroup", "Rate", "Section", "SourceSheet", "Unit" },
                values: new object[,]
                {
                    { 1, true, "Emergency Work", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Initial site inspection and quick make-safe allowance", "MRS-001", "Emergency", 850m, "Starter", "Starter", "Each" },
                    { 2, true, "Building Work", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Replace damaged ceiling board", "MRS-002", "Building", 420m, "Starter", "Starter", "m2" },
                    { 3, true, "Painting", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Prepare and paint interior wall", "MRS-003", "Building", 95m, "Starter", "Starter", "m2" },
                    { 4, true, "Waterproofing", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Torch-on waterproofing repair", "MRS-004", "Roofing", 310m, "Starter", "Starter", "m2" },
                    { 5, true, "Cleaning", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Post-repair cleaning crew", "MRS-005", "Building", 280m, "Starter", "Starter", "Hour" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_AssessorId_Status_AppointmentStart",
                table: "Appointments",
                columns: new[] { "AssessorId", "Status", "AppointmentStart" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ClientId",
                table: "Appointments",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_Active",
                table: "Clients",
                column: "Active");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_Name",
                table: "Clients",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PriceItems_Active_QuoteGroup",
                table: "PriceItems",
                columns: new[] { "Active", "QuoteGroup" });

            migrationBuilder.CreateIndex(
                name: "IX_QuoteItems_PriceItemId",
                table: "QuoteItems",
                column: "PriceItemId");

            migrationBuilder.CreateIndex(
                name: "IX_QuoteItems_QuoteId",
                table: "QuoteItems",
                column: "QuoteId");

            migrationBuilder.CreateIndex(
                name: "IX_QuotePhotos_QuoteId",
                table: "QuotePhotos",
                column: "QuoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_AppointmentId",
                table: "Quotes",
                column: "AppointmentId",
                unique: true,
                filter: "[AppointmentId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_AssessorId",
                table: "Quotes",
                column: "AssessorId");

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_ClientId",
                table: "Quotes",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_QuoteNumber",
                table: "Quotes",
                column: "QuoteNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quotes_Status_CreatedAt",
                table: "Quotes",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_QuoteAdministratorId",
                table: "Users",
                column: "QuoteAdministratorId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Role",
                table: "Users",
                column: "Role");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuoteItems");

            migrationBuilder.DropTable(
                name: "QuotePhotos");

            migrationBuilder.DropTable(
                name: "PriceItems");

            migrationBuilder.DropTable(
                name: "Quotes");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropTable(
                name: "Clients");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
