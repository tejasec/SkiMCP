import { downloadFile } from './exportReport';

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  source: 'pasted' | 'upload' | 'url' | 'preset';
  sourceLabel?: string;
  manifestFingerprint: string;
  toolFingerprints: Record<string, string>;
  riskScore: number;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  totalTools: number;
  totalFindings: number;
  rawManifest: string;
}

const STORAGE_KEY = 'mcp_scanner_scan_history_v1';
const MAX_HISTORY_ITEMS = 50;

/**
 * Loads scan history entries from localStorage.
 */
export function getScanHistory(): ScanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load scan history from localStorage:', err);
    return [];
  }
}

/**
 * Saves a new scan entry to localStorage, maintaining a max limit of 50.
 */
export function saveScanToHistory(
  entry: Omit<ScanHistoryEntry, 'id' | 'timestamp'>,
): ScanHistoryEntry | null {
  try {
    const current = getScanHistory();
    const newEntry: ScanHistoryEntry = {
      ...entry,
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    // Prevent identical consecutive duplicate entries
    if (
      current.length > 0 &&
      current[0].manifestFingerprint === newEntry.manifestFingerprint &&
      Date.now() - new Date(current[0].timestamp).getTime() < 3000
    ) {
      return current[0];
    }

    const updated = [newEntry, ...current].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (err) {
    console.warn('Failed to save scan history to localStorage:', err);
    return null;
  }
}

/**
 * Deletes a single item from scan history.
 */
export function deleteScanHistoryItem(id: string): void {
  try {
    const current = getScanHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete history item:', err);
  }
}

/**
 * Clears all scan history from localStorage.
 */
export function clearScanHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear history:', err);
  }
}

/**
 * Exports scan history as a downloadable JSON file.
 */
export function exportScanHistory(): void {
  const history = getScanHistory();
  const jsonStr = JSON.stringify(history, null, 2);
  downloadFile(
    `scourmcp-history-${new Date().toISOString().split('T')[0]}.json`,
    jsonStr,
    'application/json;charset=utf-8',
  );
}
