/**
 * ProScale Advisory: Export Utility
 * Generates Big 4 level branded Excel reports from reconciliation data.
 */

import ExcelJS from "exceljs";

export class ExportUtil {
  /**
   * Generates and downloads a professional reconciliation report
   */
  static async exportReconToExcel(
    fileName: string,
    results: any[],
    mapping: { pr: any; g2b: any },
    prHeaders: string[],
    g2bHeaders: string[]
  ) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reconciliation Report");

    // 1. BRANDING & HEADER
    sheet.getCell("A1").value = "ProScale Advisory: GST Reconciliation Report";
    sheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF1E293B" } };
    sheet.mergeCells("A1:E1");

    sheet.getCell("A2").value = `Source File: ${fileName}`;
    sheet.getCell("A3").value = `Generated On: ${new Date().toLocaleString()}`;
    sheet.getCell("A4").value = `Total Records: ${results.length}`;

    // 2. DEFINE TABLE HEADERS
    const startRow = 6;
    const columns = [
      { name: "Match Status", width: 25 },
      { name: "Matching Logic", width: 15 },
      ...prHeaders.map((h) => ({ name: `PR_${h}`, width: 15 })),
      ...g2bHeaders.map((h) => ({ name: `2B_${h}`, width: 15 })),
    ];

    // Add headers to sheet
    columns.forEach((col, i) => {
      const cell = sheet.getCell(startRow, i + 1);
      cell.value = col.name;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF334155" },
      };
      sheet.getColumn(i + 1).width = col.width;
    });

    // 3. FILL DATA
    results.forEach((res, rowIdx) => {
      const currentRow = startRow + 1 + rowIdx;
      
      // Status & Key
      sheet.getCell(currentRow, 1).value = res.status;
      sheet.getCell(currentRow, 2).value = res.key || "-";

      // Apply Conditional Formatting for Status
      const statusCell = sheet.getCell(currentRow, 1);
      if (res.status === "Matched") {
        statusCell.font = { color: { argb: "FF059669" }, bold: true };
      } else if (res.status.includes("Mismatch")) {
        statusCell.font = { color: { argb: "FFD97706" }, bold: true };
      } else {
        statusCell.font = { color: { argb: "FFDC2626" }, bold: true };
      }

      // PR Data
      prHeaders.forEach((h, i) => {
        sheet.getCell(currentRow, 3 + i).value = res.pr[i];
      });

      // 2B Data
      g2bHeaders.forEach((h, i) => {
        sheet.getCell(currentRow, 3 + prHeaders.length + i).value = res.g2b ? res.g2b[i] : "";
      });
    });

    // 4. DOWNLOAD
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ProScale_Recon_${fileName.split(".")[0]}_${new Date().getTime()}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
