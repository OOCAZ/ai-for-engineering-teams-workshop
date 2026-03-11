/**
 * exportUtils.ts
 *
 * Data export utilities for the Customer Intelligence Dashboard.
 * Supports CSV and JSON downloads with progress reporting, cancellation
 * via AbortController, and an audit log in localStorage.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportableData {
  [key: string]: string | number | boolean | null;
}

export interface ExportOptions {
  /** Override the auto-generated filename (without extension). */
  filename?: string;
  /** ISO date strings for filtering. */
  dateRange?: { from: string; to: string };
  /** Customer segment filter label (used for audit log only). */
  segment?: string;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Called with 0–100 progress during processing of large datasets. */
  onProgress?: (percent: number) => void;
}

export interface ExportAuditEntry {
  timestamp: string;
  type: 'csv' | 'json';
  rowCount: number;
  segment?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUDIT_LOG_KEY = 'dashboard_export_audit_log';
const PROGRESS_THRESHOLD = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a filename using the convention: `{dataType}-{YYYY-MM-DD}-{HH-mm}.{ext}`
 */
function buildFilename(dataType: string, ext: 'csv' | 'json'): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const time = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  return `${dataType}-${date}-${time}.${ext}`;
}

/**
 * Triggers a browser download for the given content blob.
 */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Writes an audit entry to localStorage. Silently ignores storage errors
 * (e.g., private browsing quota exceeded).
 */
function writeAuditEntry(entry: ExportAuditEntry): void {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    const log: ExportAuditEntry[] = raw ? (JSON.parse(raw) as ExportAuditEntry[]) : [];
    log.push(entry);
    // Keep the last 200 entries to bound storage growth
    if (log.length > 200) {
      log.splice(0, log.length - 200);
    }
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log));
  } catch {
    // Silently swallow storage errors
  }
}

/**
 * Escapes a single CSV field value, quoting if it contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string | number | boolean | null): string {
  if (value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of ExportableData rows to a CSV string.
 * Reports progress every 10 rows for datasets over the threshold.
 */
function buildCsvContent(
  data: ExportableData[],
  signal: AbortSignal | undefined,
  onProgress: ((percent: number) => void) | undefined,
): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const lines: string[] = [headers.map(escapeCsvField).join(',')];
  const reportProgress = data.length > PROGRESS_THRESHOLD && onProgress !== undefined;

  for (let i = 0; i < data.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled by user', 'AbortError');
    }
    const row = data[i];
    lines.push(headers.map((h) => escapeCsvField(row[h] ?? null)).join(','));

    if (reportProgress && i % 10 === 0) {
      onProgress(Math.round(((i + 1) / data.length) * 100));
    }
  }

  if (reportProgress) {
    onProgress(100);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Exports data as a CSV file download.
 * Writes an audit entry to localStorage on success.
 *
 * @throws DOMException with name 'AbortError' if the signal is aborted mid-export.
 */
export function exportToCSV(
  data: ExportableData[],
  dataType: string,
  options: ExportOptions = {},
): void {
  const { filename, segment, signal, onProgress } = options;

  const csvContent = buildCsvContent(data, signal, onProgress);
  const resolvedFilename = filename
    ? `${filename}.csv`
    : buildFilename(dataType, 'csv');

  triggerDownload(csvContent, resolvedFilename, 'text/csv;charset=utf-8;');

  writeAuditEntry({
    timestamp: new Date().toISOString(),
    type: 'csv',
    rowCount: data.length,
    ...(segment !== undefined ? { segment } : {}),
  });
}

/**
 * Exports data as a JSON file download.
 * Writes an audit entry to localStorage on success.
 *
 * @throws DOMException with name 'AbortError' if the signal is aborted mid-export.
 */
export function exportToJSON(
  data: ExportableData[],
  dataType: string,
  options: ExportOptions = {},
): void {
  const { filename, segment, signal, onProgress } = options;

  if (signal?.aborted) {
    throw new DOMException('Export cancelled by user', 'AbortError');
  }

  // For large datasets, chunk the serialization and report progress
  let jsonContent: string;
  if (data.length > PROGRESS_THRESHOLD && onProgress !== undefined) {
    const chunks: string[] = [];
    for (let i = 0; i < data.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Export cancelled by user', 'AbortError');
      }
      chunks.push(JSON.stringify(data[i]));
      if (i % 10 === 0) {
        onProgress(Math.round(((i + 1) / data.length) * 100));
      }
    }
    onProgress(100);
    jsonContent = `[${chunks.join(',')}]`;
  } else {
    jsonContent = JSON.stringify(data, null, 2);
  }

  const resolvedFilename = filename
    ? `${filename}.json`
    : buildFilename(dataType, 'json');

  triggerDownload(jsonContent, resolvedFilename, 'application/json;charset=utf-8;');

  writeAuditEntry({
    timestamp: new Date().toISOString(),
    type: 'json',
    rowCount: data.length,
    ...(segment !== undefined ? { segment } : {}),
  });
}

/**
 * Retrieves the export audit log from localStorage.
 * Returns an empty array if the log is missing or malformed.
 */
export function getExportAuditLog(): ExportAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ExportAuditEntry[];
  } catch {
    return [];
  }
}
