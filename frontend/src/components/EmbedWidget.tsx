import { useMemo } from 'react';
import { getBadgeInfo } from '../lib/exportReport';

export interface EmbedData {
  score: number;
  risk: 'critical' | 'high' | 'medium' | 'low';
  tools: number;
  findings: number;
  fingerprint: string;
  serverName?: string;
}

export default function EmbedWidget() {
  const data: EmbedData = useMemo(() => {
    // 1. Try URL Hash (e.g. #data=base64...)
    const hash = window.location.hash.replace(/^#/, '');
    const searchParams = new URLSearchParams(window.location.search);
    const rawParam = searchParams.get('data') || (hash.startsWith('data=') ? hash.slice(5) : '');

    if (rawParam) {
      try {
        const decoded = atob(decodeURIComponent(rawParam));
        return JSON.parse(decoded);
      } catch (e) {
        console.warn('Failed to parse base64 embed data', e);
      }
    }

    // Default fallback sample data if accessed directly without payload
    return {
      score: 15,
      risk: 'low',
      tools: 4,
      findings: 1,
      fingerprint: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      serverName: 'Sample MCP Server',
    };
  }, []);

  const badge = getBadgeInfo(data.score, data.risk);
  const truncatedHash = data.fingerprint ? data.fingerprint.slice(0, 16) + '...' : 'sha256:...';

  return (
    <div className="embed-widget-container">
      <div className="embed-widget-card">
        <div className="embed-header">
          <div className="embed-brand">
            <span className="embed-shield">🛡️</span>
            <div>
              <span className="embed-title">
                {data.serverName || 'MCP Manifest Security'}
              </span>
              <span className="embed-sub">Audited by ScourMCP</span>
            </div>
          </div>
          <img src={badge.badgeUrl} alt="Risk Badge" className="embed-badge-img" />
        </div>

        <div className="embed-metrics-row">
          <div className="embed-metric">
            <span className="embed-metric-num">{data.score}/100</span>
            <span className="embed-metric-label">Risk Score</span>
          </div>
          <div className="embed-metric">
            <span className="embed-metric-num">{data.tools}</span>
            <span className="embed-metric-label">Tools</span>
          </div>
          <div className="embed-metric">
            <span className="embed-metric-num">{data.findings}</span>
            <span className="embed-metric-label">Findings</span>
          </div>
        </div>

        <div className="embed-footer">
          <code className="embed-hash" title={data.fingerprint}>
            {truncatedHash}
          </code>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="embed-report-link"
          >
            Full Report ➔
          </a>
        </div>
      </div>
    </div>
  );
}
