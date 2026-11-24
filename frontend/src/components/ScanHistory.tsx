import { useState, useEffect } from 'react';
import {
  getScanHistory,
  clearScanHistory,
  deleteScanHistoryItem,
  exportScanHistory,
  type ScanHistoryEntry,
} from '../lib/history';
import Icon from './Icon';

interface ScanHistoryProps {
  onLoadManifest: (rawManifest: string) => void;
  onCompare: (baselineManifest: string, targetManifest: string) => void;
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

export default function ScanHistory({ onLoadManifest, onCompare }: ScanHistoryProps) {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getScanHistory());
  }, []);

  function refresh() {
    setHistory(getScanHistory());
    setSelectedIds([]);
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        // Keep the second one and add the new one
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  function handleCompareSelected() {
    if (selectedIds.length !== 2) return;
    const item1 = history.find((h) => h.id === selectedIds[0]);
    const item2 = history.find((h) => h.id === selectedIds[1]);
    if (!item1 || !item2) return;

    // Older scan as baseline, newer scan as target
    const [baseline, target] =
      new Date(item1.timestamp).getTime() <= new Date(item2.timestamp).getTime()
        ? [item1, item2]
        : [item2, item1];

    onCompare(baseline.rawManifest, target.rawManifest);
  }

  function handleClear() {
    if (confirm('Clear all local scan history? This action cannot be undone.')) {
      clearScanHistory();
      refresh();
    }
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteScanHistoryItem(id);
    refresh();
  }

  return (
    <div className="card scan-history-card">
      <div className="history-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="history-header-title">
          <span className="history-icon">
            <Icon name="history" size={18} />
          </span>
          <h3>Local Scan History</h3>
          <span className="history-badge">{history.length} saved</span>
        </div>
        <div className="history-header-actions">
          <span className="history-toggle-hint">
            {isOpen ? (
              <>
                Collapse <Icon name="chevron-up" size={12} />
              </>
            ) : (
              <>
                Expand <Icon name="chevron-down" size={12} />
              </>
            )}
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="history-body">
          <div className="history-toolbar">
            <span className="history-info-text">
              Persisted in browser localStorage (max 50). Select any 2 scans to run a Permission Diff.
            </span>
            <div className="history-action-buttons">
              {selectedIds.length === 2 && (
                <button
                  type="button"
                  className="btn-sm btn-safe"
                  onClick={handleCompareSelected}
                >
                  <Icon name="diff" size={13} /> Compare Selected (2)
                </button>
              )}
              {history.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn-sm btn-outline"
                    onClick={exportScanHistory}
                    title="Export history as JSON"
                  >
                    <Icon name="history" size={13} /> Export History
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-outline"
                    onClick={handleClear}
                    title="Clear history"
                  >
                    <Icon name="trash" size={13} /> Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="history-empty">
              No scans recorded yet. Scan a manifest or URL above to automatically record audit snapshots.
            </div>
          ) : (
            <div className="history-list">
              {history.map((entry) => {
                const isSelected = selectedIds.includes(entry.id);
                const dateStr = new Date(entry.timestamp).toLocaleString();
                const shortHash = entry.manifestFingerprint.slice(0, 18) + '...';

                return (
                  <div
                    key={entry.id}
                    className={`history-item ${isSelected ? 'history-item-selected' : ''}`}
                    onClick={() => handleToggleSelect(entry.id)}
                  >
                    <div className="history-item-select">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(entry.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Select scan for diff comparison"
                      />
                    </div>

                    <div className="history-item-content">
                      <div className="history-item-row-1">
                        <span className={`badge ${SEVERITY_BADGE[entry.overallRisk]}`}>
                          {entry.riskScore}/100 {entry.overallRisk.toUpperCase()}
                        </span>
                        <span className="history-item-source">
                          {entry.source === 'url' ? (
                            <>
                              <Icon name="globe" size={12} /> URL
                            </>
                          ) : (
                            <>
                              <Icon name="file-json" size={12} /> Manifest
                            </>
                          )}{' '}
                          {entry.sourceLabel ? `(${entry.sourceLabel})` : ''}
                        </span>
                        <span className="history-item-date">{dateStr}</span>
                      </div>

                      <div className="history-item-row-2">
                        <span className="history-item-stats">
                          <strong>{entry.totalTools}</strong> tools ·{' '}
                          <strong>{entry.totalFindings}</strong> findings
                        </span>
                        <code className="history-item-hash" title={entry.manifestFingerprint}>
                          {shortHash}
                        </code>
                      </div>
                    </div>

                    <div className="history-item-actions">
                      <button
                        type="button"
                        className="btn-sm btn-outline history-load-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadManifest(entry.rawManifest);
                        }}
                        title="Load this manifest in scanner"
                      >
                        <Icon name="search" size={12} /> Load
                      </button>
                      <button
                        type="button"
                        className="history-delete-btn"
                        onClick={(e) => handleDelete(entry.id, e)}
                        title="Delete this snapshot"
                        aria-label="Delete snapshot"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
