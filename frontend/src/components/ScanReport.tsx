import { useState, useMemo } from 'react';
import type { ScanReport as ScanReportType } from '../lib/api';
import RiskGauge from './RiskGauge';
import {
  getBadgeInfo,
  generateMarkdownReport,
  downloadFile,
} from '../lib/exportReport';
import { hardenManifest, type HardenedManifestResult } from '../lib/api';

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

const CATEGORY_MAP: Record<string, { label: string; icon: string; rules: string[] }> = {
  shell: {
    label: 'Shell & Execution',
    icon: '⚡',
    rules: ['shell-execution', 'tool-shadowing'],
  },
  fs: {
    label: 'Filesystem Access',
    icon: '📁',
    rules: ['filesystem-broad', 'filesystem-sensitive'],
  },
  net: {
    label: 'Network & Egress',
    icon: '🌐',
    rules: ['network-egress'],
  },
  cred: {
    label: 'Credentials & Secrets',
    icon: '🔑',
    rules: ['credential-access'],
  },
  prompt: {
    label: 'Prompt & AI Integrity',
    icon: '🎯',
    rules: ['prompt-injection', 'obfuscation-detected', 'resource-prompt-injection'],
  },
  advisory: {
    label: 'Advisories & Blocklist',
    icon: '⚠️',
    rules: ['advisory-match'],
  },
  schema: {
    label: 'Schema Scope',
    icon: '📐',
    rules: ['over-permission', 'vague-description'],
  },
};

interface ScanReportProps {
  report: ScanReportType;
  rawManifestInput?: string;
}

export default function ScanReport({ report, rawManifestInput }: ScanReportProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showFingerprints, setShowFingerprints] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Hardening modal state
  const [isHardening, setIsHardening] = useState(false);
  const [hardenedResult, setHardenedResult] = useState<HardenedManifestResult | null>(null);
  const [showHardenedModal, setShowHardenedModal] = useState(false);
  const [copiedHardened, setCopiedHardened] = useState(false);

  // Embed widget modal state
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const badge = getBadgeInfo(report.summary.riskScore, report.summary.overallRisk);

  function toggle(i: number) {
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function handleCopyBadge() {
    navigator.clipboard.writeText(badge.markdown);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  }

  function handleCopyJson() {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  function handleDownloadMarkdown() {
    const md = generateMarkdownReport(report);
    downloadFile('MCP_SECURITY_REPORT.md', md, 'text/markdown;charset=utf-8');
  }

  function handleDownloadJson() {
    const jsonStr = JSON.stringify(report, null, 2);
    downloadFile('mcp-security-report.json', jsonStr, 'application/json;charset=utf-8');
  }

  async function handleGenerateHardened() {
    setIsHardening(true);
    try {
      const payload = rawManifestInput || JSON.stringify({ tools: report.tools });
      const result = await hardenManifest(payload);
      setHardenedResult(result);
      setShowHardenedModal(true);
    } catch (err) {
      alert(`Hardening failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsHardening(false);
    }
  }

  function handleCopyHardened() {
    if (!hardenedResult) return;
    navigator.clipboard.writeText(
      JSON.stringify(hardenedResult.hardenedManifest, null, 2),
    );
    setCopiedHardened(true);
    setTimeout(() => setCopiedHardened(false), 2000);
  }

  function handleDownloadHardened() {
    if (!hardenedResult) return;
    downloadFile(
      'mcp-manifest.hardened.json',
      JSON.stringify(hardenedResult.hardenedManifest, null, 2),
      'application/json;charset=utf-8',
    );
  }

  // ── Permission Categories ───────────────────────────────────────────────
  const categories = useMemo(() => {
    return Object.entries(CATEGORY_MAP).map(([key, cat]) => {
      const matched = report.findings.filter((f) => cat.rules.includes(f.ruleId));
      let topSev: 'critical' | 'high' | 'medium' | 'low' = 'low';
      const sevs = matched.map((m) => m.severity);
      if (sevs.includes('critical')) topSev = 'critical';
      else if (sevs.includes('high')) topSev = 'high';
      else if (sevs.includes('medium')) topSev = 'medium';

      return {
        key,
        label: cat.label,
        icon: cat.icon,
        count: matched.length,
        topSev,
      };
    });
  }, [report.findings]);

  // Filtered findings based on selected category
  const filteredFindings = useMemo(() => {
    if (!selectedCategory) return report.findings;
    const cat = CATEGORY_MAP[selectedCategory];
    if (!cat) return report.findings;
    return report.findings.filter((f) => cat.rules.includes(f.ruleId));
  }, [report.findings, selectedCategory]);

  // Check for any community advisory matches
  const advisoryFindings = useMemo(() => {
    return report.findings.filter((f) => f.ruleId === 'advisory-match');
  }, [report.findings]);

  // ── 4-Pillar Multi-Dimensional Risk Metrics ─────────────────────────────
  const pillars = useMemo(() => {
    const p1Rules = ['shell-execution', 'tool-shadowing'];
    const p2Rules = [
      'filesystem-broad',
      'filesystem-sensitive',
      'network-egress',
      'credential-access',
    ];
    const p3Rules = [
      'prompt-injection',
      'obfuscation-detected',
      'resource-prompt-injection',
    ];
    const p4Rules = ['over-permission', 'vague-description'];

    function computePillar(rules: string[]) {
      const matched = report.findings.filter((f) => rules.includes(f.ruleId));
      let points = 0;
      for (const f of matched) {
        if (f.severity === 'critical') points += 30;
        else if (f.severity === 'high') points += 15;
        else if (f.severity === 'medium') points += 5;
        else points += 2;
      }
      const score = Math.min(100, points);
      let level: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (score >= 50) level = 'critical';
      else if (score >= 30) level = 'high';
      else if (score >= 10) level = 'medium';

      return { count: matched.length, score, level };
    }

    return {
      execution: computePillar(p1Rules),
      boundary: computePillar(p2Rules),
      prompt: computePillar(p3Rules),
      privilege: computePillar(p4Rules),
    };
  }, [report.findings]);

  // Generate Embed Snippet
  const embedCode = useMemo(() => {
    const payload = {
      score: report.summary.riskScore,
      risk: report.summary.overallRisk,
      tools: report.summary.totalTools,
      findings: report.summary.totalFindings,
      fingerprint: report.manifestFingerprint,
    };
    const b64 = btoa(JSON.stringify(payload));
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://skimcp.example.com';
    return `<iframe src="${origin}/embed?data=${encodeURIComponent(b64)}" width="380" height="135" frameborder="0"></iframe>`;
  }, [report]);

  function handleCopyEmbed() {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }

  return (
    <div className="card report-card">
      {/* ── Community Advisory Warning Banner (F-11) ── */}
      {advisoryFindings.length > 0 && (
        <div className="advisory-alert-banner">
          <div className="advisory-alert-icon">⚠️</div>
          <div className="advisory-alert-text">
            <strong>Community Advisory Match:</strong> {advisoryFindings.length} tool(s) match
            known malicious patterns or blocklist signatures! Review findings below immediately.
          </div>
        </div>
      )}

      <div className="card-header report-card-header">
        <div>
          <h2>Security Audit Results</h2>
          <div className="badge-preview-row">
            <img
              src={badge.badgeUrl}
              alt="MCP Security Risk Badge"
              className="shields-badge"
            />
            <span className="badge-score-caption">
              Score: {report.summary.riskScore}/100
            </span>
          </div>
        </div>

        <div className="export-actions">
          <button
            type="button"
            className="btn-sm btn-safe harden-btn-action"
            onClick={handleGenerateHardened}
            disabled={isHardening}
            title="Automatically strip prompt injection, enforce additionalProperties: false, and add path regex"
          >
            {isHardening ? '🛡️ Hardening...' : '🛡️ Generate Hardened Manifest'}
          </button>
          <button
            type="button"
            className="btn-sm btn-outline"
            onClick={() => setShowEmbedModal(true)}
            title="Get embeddable iframe widget code"
          >
            🔗 Embed Widget
          </button>
          <button
            type="button"
            className="btn-sm btn-outline"
            onClick={handleCopyBadge}
            title="Copy Shields.io Markdown badge"
          >
            {copiedBadge ? '✓ Badge Copied!' : '🛡️ Copy Badge'}
          </button>
          <button
            type="button"
            className="btn-sm btn-outline"
            onClick={handleCopyJson}
            title="Copy raw JSON to clipboard"
          >
            {copiedJson ? '✓ JSON Copied!' : '📋 Copy JSON'}
          </button>
          <button
            type="button"
            className="btn-sm btn-primary export-btn"
            onClick={handleDownloadMarkdown}
            title="Download standalone Markdown audit report"
          >
            📥 Export Report (MD)
          </button>
          <button
            type="button"
            className="btn-sm btn-outline"
            onClick={handleDownloadJson}
            title="Download full JSON report"
          >
            📥 Export JSON
          </button>
        </div>
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
            <span className="stat-label">Audit Date</span>
          </div>
        </div>
      </div>

      {/* ── F-9: Standalone Permission Category Breakdown ── */}
      <div className="category-breakdown-section">
        <div className="category-section-header">
          <h3>Permission Category Breakdown</h3>
          <span className="category-section-sub">
            Filter findings by threat category {selectedCategory && `(Filtered: ${CATEGORY_MAP[selectedCategory]?.label})`}
          </span>
          {selectedCategory && (
            <button
              type="button"
              className="btn-inline clear-filter-btn"
              onClick={() => setSelectedCategory(null)}
            >
              Reset Filter ✕
            </button>
          )}
        </div>

        <div className="category-cards-grid">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <div
                key={cat.key}
                className={`category-card ${cat.count > 0 ? `cat-has-findings sev-${cat.topSev}` : 'cat-clean'} ${isSelected ? 'cat-selected' : ''}`}
                onClick={() => setSelectedCategory(isSelected ? null : cat.key)}
                title={`Click to filter findings by ${cat.label}`}
              >
                <div className="cat-card-top">
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-count-badge">{cat.count}</span>
                </div>
                <div className="cat-label">{cat.label}</div>
                {cat.count > 0 ? (
                  <span className={`cat-sev-indicator ${SEVERITY_BADGE[cat.topSev]}`}>
                    {cat.topSev.toUpperCase()}
                  </span>
                ) : (
                  <span className="cat-clean-indicator">Clean</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4-Pillar Multi-Dimensional Risk Visualizer ── */}
      <div className="pillars-container">
        <div className="pillars-header">
          <h3>4-Pillar Threat Breakdown</h3>
          <span className="pillars-sub">Multidimensional risk categorization across attack surfaces</span>
        </div>

        <div className="pillars-grid">
          <div className={`pillar-box pillar-${pillars.execution.level}`}>
            <div className="pillar-title-row">
              <span className="pillar-icon">⚡</span>
              <span className="pillar-name">Execution Safety</span>
              <span className="pillar-count">{pillars.execution.count} findings</span>
            </div>
            <div className="pillar-meter-wrap">
              <div
                className="pillar-meter-fill"
                style={{ width: `${Math.max(6, pillars.execution.score)}%` }}
              />
            </div>
            <span className="pillar-desc">Shell commands, process spawns & tool shadowing</span>
          </div>

          <div className={`pillar-box pillar-${pillars.boundary.level}`}>
            <div className="pillar-title-row">
              <span className="pillar-icon">🌐</span>
              <span className="pillar-name">Data & Network Boundary</span>
              <span className="pillar-count">{pillars.boundary.count} findings</span>
            </div>
            <div className="pillar-meter-wrap">
              <div
                className="pillar-meter-fill"
                style={{ width: `${Math.max(6, pillars.boundary.score)}%` }}
              />
            </div>
            <span className="pillar-desc">Broad filesystem traversal, HTTP egress & keys</span>
          </div>

          <div className={`pillar-box pillar-${pillars.prompt.level}`}>
            <div className="pillar-title-row">
              <span className="pillar-icon">🎯</span>
              <span className="pillar-name">Prompt & AI Integrity</span>
              <span className="pillar-count">{pillars.prompt.count} findings</span>
            </div>
            <div className="pillar-meter-wrap">
              <div
                className="pillar-meter-fill"
                style={{ width: `${Math.max(6, pillars.prompt.score)}%` }}
              />
            </div>
            <span className="pillar-desc">Hidden XML tags, zero-width steganography & BiDi</span>
          </div>

          <div className={`pillar-box pillar-${pillars.privilege.level}`}>
            <div className="pillar-title-row">
              <span className="pillar-icon">📐</span>
              <span className="pillar-name">Privilege & Schema Scope</span>
              <span className="pillar-count">{pillars.privilege.count} findings</span>
            </div>
            <div className="pillar-meter-wrap">
              <div
                className="pillar-meter-fill"
                style={{ width: `${Math.max(6, pillars.privilege.score)}%` }}
              />
            </div>
            <span className="pillar-desc">Over-permission, open schemas & vague descriptions</span>
          </div>
        </div>
      </div>

      {/* ── F-8: Runtime Canary Observations (if present) ── */}
      {report.canaryObservations && report.canaryObservations.length > 0 && (
        <div className="canary-container">
          <div className="canary-header">
            <h3>🧪 Runtime Canary Sandbox Observations</h3>
            <span className="canary-sub">
              Live inert test probes executed against server to observe runtime side-effect boundaries
            </span>
          </div>

          <div className="canary-table-wrap">
            <table className="canary-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Probe Type</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Observed Response Details</th>
                </tr>
              </thead>
              <tbody>
                {report.canaryObservations.map((obs, idx) => (
                  <tr key={idx} className={`canary-row canary-${obs.status}`}>
                    <td><code>{obs.toolName}</code></td>
                    <td><span className="canary-probe-pill">{obs.probeType}</span></td>
                    <td>
                      <span className={`badge ${obs.status === 'suspicious' ? 'badge-critical' : obs.status === 'anomaly' ? 'badge-high' : 'badge-low'}`}>
                        {obs.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{obs.latencyMs}ms</td>
                    <td>{obs.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manifest Fingerprint Box */}
      <div className="fingerprint-banner">
        <div className="fingerprint-header">
          <span className="fingerprint-label">🔑 Manifest SHA-256 Fingerprint:</span>
          <code className="fingerprint-hash">{report.manifestFingerprint}</code>
          <button
            type="button"
            className="btn-inline"
            onClick={() => setShowFingerprints(!showFingerprints)}
          >
            {showFingerprints ? 'Hide Tool Hashes ▲' : 'View Tool Lockfile ▼'}
          </button>
        </div>

        {showFingerprints && (
          <div className="tool-fingerprints-table">
            <h4>Tool Integrity Lockfile (Canonical Schema Hashes)</h4>
            <table>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.toolFingerprints || {}).map(([name, hash]) => (
                  <tr key={name}>
                    <td><code>{name}</code></td>
                    <td><code>{hash}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="no-findings">
          {selectedCategory
            ? `✅ No findings in "${CATEGORY_MAP[selectedCategory]?.label}".`
            : '✅ No security issues found. This manifest complies with MCP safety guidelines.'}
        </div>
      ) : (
        <div className="findings-list">
          {filteredFindings.map((f, i) => (
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
                  {f.toolFingerprint && (
                    <div className="detail-block">
                      <strong>Tool Fingerprint:</strong>
                      <code>{f.toolFingerprint}</code>
                    </div>
                  )}
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

      {/* ── Hardened Manifest Modal ── */}
      {showHardenedModal && hardenedResult && (
        <div className="modal-backdrop">
          <div className="modal-content hardened-modal">
            <div className="modal-header">
              <div>
                <h3>🛡️ Automated Hardened Manifest</h3>
                <p className="modal-subtitle">
                  One-click remediation applied: stripped injection directives, locked additionalProperties, and enforced path validation regex.
                </p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowHardenedModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="hardening-score-comparison">
              <div className="score-badge-before">
                <span className="label">Original Risk:</span>
                <span className="val">{hardenedResult.beforeScore}/100</span>
              </div>
              <div className="score-arrow">➔</div>
              <div className="score-badge-after">
                <span className="label">Hardened Risk:</span>
                <span className="val">{hardenedResult.afterScore}/100</span>
                <span className="diff">(-{hardenedResult.scoreReduction} pts)</span>
              </div>
            </div>

            <div className="hardening-fixes-list">
              <h4>Applied Security Fixes ({hardenedResult.changesApplied.length}):</h4>
              {hardenedResult.changesApplied.length === 0 ? (
                <p className="no-fixes-needed">Manifest was already clamped and clean.</p>
              ) : (
                <ul>
                  {hardenedResult.changesApplied.map((ch, idx) => (
                    <li key={idx}>
                      <code>{ch.toolName}</code>: {ch.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hardening-json-viewer">
              <pre>{JSON.stringify(hardenedResult.hardenedManifest, null, 2)}</pre>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-sm btn-outline"
                onClick={handleCopyHardened}
              >
                {copiedHardened ? '✓ JSON Copied!' : '📋 Copy JSON'}
              </button>
              <button
                type="button"
                className="btn-sm btn-safe"
                onClick={handleDownloadHardened}
              >
                📥 Download Hardened Manifest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── F-13: Embed Widget Modal ── */}
      {showEmbedModal && (
        <div className="modal-backdrop">
          <div className="modal-content embed-modal">
            <div className="modal-header">
              <div>
                <h3>🔗 Embeddable Scan Badge & Widget</h3>
                <p className="modal-subtitle">
                  Embed this live scan summary into documentation, READMEs, or dashboards.
                </p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowEmbedModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="embed-preview-section">
              <h4>Widget Preview:</h4>
              <div className="embed-preview-box">
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>
                        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F4F3EE; color: #1F1E1D; padding: 12px; }
                        .card { border: 1px solid #B1ADA1; border-radius: 8px; padding: 10px 12px; background: #FFFFFF; display: flex; flex-direction: column; gap: 8px; }
                        .top { display: flex; justify-content: space-between; align-items: center; }
                        .title { font-weight: 600; font-size: 13px; color: #C15F3C; }
                        .stats { display: flex; gap: 12px; font-size: 12px; color: #6E6B65; }
                        .stats strong { color: #1F1E1D; }
                        .badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${badge.color === 'red' ? '#ef4444' : badge.color === 'orange' ? '#f97316' : badge.color === 'yellow' ? '#eab308' : '#16a34a'}; color: #fff; }
                      </style>
                    </head>
                    <body>
                      <div class="card">
                        <div class="top">
                          <span class="title">🛡️ MCP Manifest Security</span>
                          <span class="badge">${badge.label.toUpperCase()} (${report.summary.riskScore}/100)</span>
                        </div>
                        <div class="stats">
                          <span>Tools: <strong>${report.summary.totalTools}</strong></span>
                          <span>Findings: <strong>${report.summary.totalFindings}</strong></span>
                          <span>Fingerprint: <code>${report.manifestFingerprint.slice(0, 14)}...</code></span>
                        </div>
                      </div>
                    </body>
                    </html>
                  `}
                  width="100%"
                  height="95"
                  frameBorder="0"
                  title="Embed Preview"
                />
              </div>
            </div>

            <div className="embed-code-section">
              <h4>HTML Iframe Code:</h4>
              <textarea
                className="embed-code-textarea"
                readOnly
                value={embedCode}
                rows={3}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-sm btn-primary"
                onClick={handleCopyEmbed}
              >
                {copiedEmbed ? '✓ Code Copied!' : '📋 Copy Embed Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
