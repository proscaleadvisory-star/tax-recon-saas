/**
 * ProScale Advisory: Excel Service
 * Handles file reading, header mapping, and data extraction
 */

import * as XLSX from 'xlsx';

export interface RowData {
  [key: string]: any;
}

export interface SheetData {
  headers: string[];
  rows: RowData[];
  rawRows: any[][];
}

export class ExcelService {
  /**
   * Reads an Excel file and returns the data for the first sheet
   */
  static async readExcelFile(file: File): Promise<SheetData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Extract raw rows
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (rawRows.length === 0) {
            throw new Error("The uploaded file is empty.");
          }

          const headers = (rawRows[0] || []).map(h => String(h || "").trim());
          const rows = XLSX.utils.sheet_to_json(worksheet) as RowData[];

          resolve({ headers, rows, rawRows });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Heuristic to map common header names to standard fields
   */
  static mapHeaders(headers: string[]) {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const mapping = {
      invoice: ["invoicenumber", "invoiceno", "invoiceid", "invno", "invoicenum"],
      gst: ["suppliergstin", "gstinofsupplier", "gstin", "suppliergst", "gst"],
      totalTax: ["totaltaxamount", "totaltax", "totaltaxamt", "totaltaxvalue"],
      name: ["suppliername", "tradename", "legalname", "vendorname", "partyname", "name"],
      date: ["invoicedate", "invdate", "date"]
    };

    const result: { [key: string]: number } = {
      invoice: -1,
      gst: -1,
      totalTax: -1,
      name: -1,
      date: -1
    };

    headers.forEach((header, index) => {
      const normalizedHeader = normalize(header);
      for (const [field, candidates] of Object.entries(mapping)) {
        if (candidates.some(c => normalizedHeader.includes(c))) {
          if (result[field] === -1) result[field] = index;
        }
      }
    });

    return result;
  }
}
