import { useRef, useCallback } from "react";
import * as XLSX from "xlsx";

export function useExcelParser() {
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true });
          const all: any[][] = [];
          for (const name of wb.SheetNames) {
            const ws = wb.Sheets[name];
            const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            all.push(...json);
          }
          resolve(all);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsBinaryString(file);
    });
  }, []);

  const parseAllSheets = useCallback((file: File): Promise<{ name: string; rows: any[][] }[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true });
          const result = wb.SheetNames.map((name) => {
            const ws = wb.Sheets[name];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            return { name, rows };
          });
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsBinaryString(file);
    });
  }, []);

  /** Parse file preserving cell styles (colors) */
  const parseWithColors = useCallback((file: File): Promise<{ name: string; rows: any[][]; styles: Record<string, any> }[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: "binary", cellDates: true, cellStyles: true });
          const result = wb.SheetNames.map((name) => {
            const ws = wb.Sheets[name];
            const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            // Extract cell styles
            const styles: Record<string, any> = {};
            const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
            for (let r = range.s.r; r <= range.e.r; r++) {
              for (let c = range.s.c; c <= range.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = ws[addr];
                if (cell && cell.s) {
                  styles[addr] = cell.s;
                }
              }
            }
            return { name, rows, styles };
          });
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsBinaryString(file);
    });
  }, []);

  return { fileRef, parseFile, parseAllSheets, parseWithColors };
}

export function cleanName(raw: string): string {
  let name = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
  name = name.replace(/\(\d+\)\s*$/, "").trim();
  return name;
}

export function parseDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  const s = String(val).trim();
  const ddmmyyyy = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  return null;
}

export function cleanPhone(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (s.length < 8) return null;
  return s;
}

/**
 * Determine student type from Excel cell background color.
 * Colors based on the spreadsheet legend:
 * - Dark blue (bg) + white text = Normal (Presencial)
 * - Cyan/light blue (bg) + black text = Reposição
 * - Very light blue (bg) + black text = Transferência
 * - Gray (bg) + white text = EAD
 * - Yellow (bg) + black text = Reserva
 * - Purple (bg) + white text = Colaborador
 */
export function getTipoAlunoFromColor(style: any): { tipo: string; modalidade: string } {
  if (!style) return { tipo: "Normal", modalidade: "Presencial" };

  const bgColor = style?.fgColor || style?.bgColor || style?.patternColor;
  if (!bgColor) return { tipo: "Normal", modalidade: "Presencial" };

  const rgb = (bgColor.rgb || bgColor.argb || "").replace(/^FF/, "").toUpperCase();
  const theme = bgColor.theme;

  // Try to classify by RGB color
  if (rgb) {
    const r = parseInt(rgb.substring(0, 2), 16) || 0;
    const g = parseInt(rgb.substring(2, 4), 16) || 0;
    const b = parseInt(rgb.substring(4, 6), 16) || 0;

    // Gray (EAD) - low saturation, mid brightness
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && r > 100 && r < 210) {
      return { tipo: "EAD", modalidade: "EAD" };
    }
    // Purple (Colaborador) - high red+blue, low green
    if (r > 100 && b > 100 && g < 100) {
      return { tipo: "Colaborador", modalidade: "Presencial" };
    }
    // Yellow (Reserva) - high red+green, low blue
    if (r > 200 && g > 200 && b < 100) {
      return { tipo: "Reserva", modalidade: "Presencial" };
    }
    // Cyan/turquoise (Reposição) - low red, high green+blue
    if (r < 150 && g > 180 && b > 180) {
      return { tipo: "Reposição", modalidade: "Presencial" };
    }
    // Very light blue (Transferência)
    if (r > 180 && g > 200 && b > 230 && b > r) {
      return { tipo: "Transferência", modalidade: "Presencial" };
    }
    // Dark blue (Normal) - low red+green, high blue
    if (b > 150 && r < 100 && g < 100) {
      return { tipo: "Normal", modalidade: "Presencial" };
    }
    // Another dark blue pattern
    if (b > r && b > g && r < 150) {
      return { tipo: "Normal", modalidade: "Presencial" };
    }
  }

  // Try theme-based detection
  if (theme !== undefined) {
    // Theme 4 is typically blue
    if (theme === 4 || theme === 5) return { tipo: "Normal", modalidade: "Presencial" };
    // Theme 7 is typically purple
    if (theme === 7) return { tipo: "Colaborador", modalidade: "Presencial" };
    // Theme 0 or 1 could be gray
    if (theme === 0 || theme === 1) return { tipo: "EAD", modalidade: "EAD" };
  }

  return { tipo: "Normal", modalidade: "Presencial" };
}
