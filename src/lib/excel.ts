import * as XLSX from "xlsx";
import type { Dataset, MetricRow } from "./anomaly";

const DATE_HINTS = ["date", "day", "week", "month", "period", "timestamp"];

function toDateLabel(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d)
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return String(v);
  }
  return String(v);
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    if (cleaned !== "" && Number.isFinite(n)) return n;
  }
  return null;
}

export async function parseWorkbook(file: File): Promise<Dataset> {
  const isCsv = /\.(csv|tsv|txt)$/i.test(file.name) || file.type === "text/csv";
  const wb = isCsv
    ? XLSX.read(await file.text(), { type: "string", raw: false, cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("The workbook has no sheets.");
  const sheet = wb.Sheets[sheetName]!;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (raw.length === 0) throw new Error("The first sheet is empty.");

  const headers = Object.keys(raw[0]!);
  const dateKey =
    headers.find((h) => DATE_HINTS.some((d) => h.toLowerCase().includes(d))) ?? headers[0]!;

  const numericKeys = headers.filter((h) => {
    if (h === dateKey) return false;
    const sample = raw.filter((r) => toNumber(r[h]) !== null).length;
    return sample >= Math.max(2, Math.floor(raw.length * 0.5));
  });

  if (numericKeys.length === 0)
    throw new Error("No numeric metric columns were found in the first sheet.");

  const rows: MetricRow[] = [];
  raw.forEach((r, i) => {
    const label = toDateLabel(r[dateKey]) ?? `Row ${i + 1}`;
    const values: Record<string, number> = {};
    let filled = 0;
    for (const k of numericKeys) {
      const n = toNumber(r[k]);
      if (n !== null) {
        values[k] = n;
        filled++;
      }
    }
    if (filled > 0) rows.push({ date: label, values });
  });

  if (rows.length < 3)
    throw new Error("Need at least 3 rows of data to establish a baseline.");

  return { fileName: file.name, metrics: numericKeys, rows };
}

export function sampleDataset(): Dataset {
  const metrics = ["Revenue", "Orders", "Traffic", "Conversion Rate", "Cost", "Refunds"];
  const rows: MetricRow[] = [];
  const start = new Date();
  start.setDate(start.getDate() - 27);
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const wave = Math.sin(i / 3) * 0.05;
    const last = i === 27;
    rows.push({
      date: d.toISOString().slice(0, 10),
      values: {
        Revenue: Math.round(42000 * (1 + wave) * (last ? 1.34 : 1)),
        Orders: Math.round(820 * (1 + wave / 2) * (last ? 1.05 : 1)),
        Traffic: Math.round(24000 * (1 + wave) * (last ? 1.48 : 1)),
        "Conversion Rate": Number((3.4 * (1 + wave / 3) * (last ? 0.71 : 1)).toFixed(2)),
        Cost: Math.round(11000 * (1 + wave / 2) * (last ? 1.39 : 1)),
        Refunds: Math.round(310 * (1 + wave / 2) * (last ? 1.12 : 1)),
      },
    });
  }
  return { fileName: "sample-business-data.xlsx", metrics, rows };
}
