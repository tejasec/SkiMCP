import { useState } from 'react';
import type { ScanReport as ScanReportType } from '../lib/api';
import RiskGauge from './RiskGauge';

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

interface ScanReportProps {
  report: ScanReportType;
}

export default function ScanReport({ report }: ScanReportProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  function toggle(i: number) {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function copyReport() {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  }

  return (
    <div className="card report-card">
      <div className="card-header">
        <h2>Scan Results</h2>
        <button className="btn-sm btn-outline" onClick={copyReport}>
          📋 Copy JSON
        </button>
      </div>

      <div className="report-summary">
        <RiskGauge
          score={report.summary.riskScore}
          risk={report.summary.overallRisk}
        />
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-num">{report.summary.totalTools}</span>
            <span className="stat-label">Tools Scanned</span>
          </div>
          <div className="stat">
            <span className="stat-num">{report.summary.totalFindings}</span>
            <span className="stat-label">Findings</span>
          </div>
          <div className="stat">
            <span className="stat-num">{report.scannedAt.split('T')[0]}</span>
            <span className="stat-label">Scanned</span>
          </div>
        </div>
      </div>

      {report.findings.length === 0 ? (
        <div className="no-findings">
          ✅ No security issues found. This manifest looks clean.
        </div>
      ) : (
        <div className="findings-list">
          {report.findings.map((f, i) => (
            <div key={i} className="finding" onClick={() => toggle(i)}>
              <div className="finding-header">
                <span className={`badge ${SEVERITY_BADGE[f.severity]}`}>
                  {f.severity.toUpperCase()}
                </span>
                <span className="finding-tool">{f.toolName}</span>
                <span className="finding-title">{f.title}</span>
                <span className="finding-toggle">
                  {expanded[i] ? '▲' : '▼'}
                </span>
              </div>
              {expanded[i] && (
                <div className="finding-details">
                  <p>{f.description}</p>
                  <div className="detail-block">
                    <strong>Evidence:</strong>
                    <code>{f.evidence}</code>
                  </div>
                  <div className="detail-block">
                    <strong>Remediation:</strong>
                    <span>{f.remediation}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
