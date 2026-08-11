export type AlertLogEntry = {
  id: string;
  at: string;
  recipients: string[];
  subject: string;
  fileName: string;
  period: string;
  metrics: string[];
  count: number;
  status: "sent" | "failed";
  error?: string;
};

const KEY = "anomaly-agent-log";

export function loadLog(): AlertLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AlertLogEntry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.id) : [];
  } catch {
    return [];
  }
}

export function saveLog(entries: AlertLogEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 100)));
  } catch {
    /* ignore */
  }
}

export function appendLog(entry: AlertLogEntry): AlertLogEntry[] {
  const next = [entry, ...loadLog()].slice(0, 100);
  saveLog(next);
  return next;
}

export function clearLog() {
  saveLog([]);
}
