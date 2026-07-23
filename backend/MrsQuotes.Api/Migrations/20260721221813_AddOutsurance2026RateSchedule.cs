using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrsQuotes.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOutsurance2026RateSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PriceItems_Active_QuoteGroup",
                table: "PriceItems");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "QuoteItems",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "InputAmount",
                table: "QuoteItems",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SystemGenerated",
                table: "QuoteItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TradeCode",
                table: "QuoteItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TradeName",
                table: "QuoteItems",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AutomaticFeeCode",
                table: "PriceItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MarkupPercentage",
                table: "PriceItems",
                type: "decimal(8,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PricingMode",
                table: "PriceItems",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PricingNote",
                table: "PriceItems",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ScheduleVersion",
                table: "PriceItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "PriceItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "SystemGenerated",
                table: "PriceItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TradeCode",
                table: "PriceItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TradeGroup",
                table: "PriceItems",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TradeName",
                table: "PriceItems",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "PriceItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AutomaticFeeCode", "MarkupPercentage", "PricingMode", "PricingNote", "ScheduleVersion", "SortOrder", "SystemGenerated", "TradeCode", "TradeGroup", "TradeName" },
                values: new object[] { null, null, "fixed", null, 0, 0, false, "", "", "" });

            migrationBuilder.UpdateData(
                table: "PriceItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "AutomaticFeeCode", "MarkupPercentage", "PricingMode", "PricingNote", "ScheduleVersion", "SortOrder", "SystemGenerated", "TradeCode", "TradeGroup", "TradeName" },
                values: new object[] { null, null, "fixed", null, 0, 0, false, "", "", "" });

            migrationBuilder.UpdateData(
                table: "PriceItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "AutomaticFeeCode", "MarkupPercentage", "PricingMode", "PricingNote", "ScheduleVersion", "SortOrder", "SystemGenerated", "TradeCode", "TradeGroup", "TradeName" },
                values: new object[] { null, null, "fixed", null, 0, 0, false, "", "", "" });

            migrationBuilder.UpdateData(
                table: "PriceItems",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "AutomaticFeeCode", "MarkupPercentage", "PricingMode", "PricingNote", "ScheduleVersion", "SortOrder", "SystemGenerated", "TradeCode", "TradeGroup", "TradeName" },
                values: new object[] { null, null, "fixed", null, 0, 0, false, "", "", "" });

            migrationBuilder.UpdateData(
                table: "PriceItems",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "AutomaticFeeCode", "MarkupPercentage", "PricingMode", "PricingNote", "ScheduleVersion", "SortOrder", "SystemGenerated", "TradeCode", "TradeGroup", "TradeName" },
                values: new object[] { null, null, "fixed", null, 0, 0, false, "", "", "" });

            migrationBuilder.CreateIndex(
                name: "IX_PriceItems_Active_ScheduleVersion_TradeCode",
                table: "PriceItems",
                columns: new[] { "Active", "ScheduleVersion", "TradeCode" });

            migrationBuilder.CreateIndex(
                name: "IX_PriceItems_ItemCode",
                table: "PriceItems",
                column: "ItemCode",
                unique: true,
                filter: "[ItemCode] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PriceItems_Active_ScheduleVersion_TradeCode",
                table: "PriceItems");

            migrationBuilder.DropIndex(
                name: "IX_PriceItems_ItemCode",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "QuoteItems");

            migrationBuilder.DropColumn(
                name: "InputAmount",
                table: "QuoteItems");

            migrationBuilder.DropColumn(
                name: "SystemGenerated",
                table: "QuoteItems");

            migrationBuilder.DropColumn(
                name: "TradeCode",
                table: "QuoteItems");

            migrationBuilder.DropColumn(
                name: "TradeName",
                table: "QuoteItems");

            migrationBuilder.DropColumn(
                name: "AutomaticFeeCode",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "MarkupPercentage",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "PricingMode",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "PricingNote",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "ScheduleVersion",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "SystemGenerated",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "TradeCode",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "TradeGroup",
                table: "PriceItems");

            migrationBuilder.DropColumn(
                name: "TradeName",
                table: "PriceItems");

            migrationBuilder.CreateIndex(
                name: "IX_PriceItems_Active_QuoteGroup",
                table: "PriceItems",
                columns: new[] { "Active", "QuoteGroup" });
        }
    }
}
