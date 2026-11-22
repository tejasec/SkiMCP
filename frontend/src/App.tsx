import { useEffect, useState } from 'react';
import { getHealth, scanManifest as scanApi, type ScanReport } from './lib/api';
import ManifestInput from './components/ManifestInput';
import ScanReportView from './components/ScanReport';

type HealthState = 'checking' | 'online' | 'offline';

export default function App() {
  const [healthState, setHealthState] = useState<HealthState>('checking');
  const [manifest, setManifest] = useState('');
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getHealth()
      .then(() => {
        if (mounted) setHealthState('online');
      })
      .catch(() => {
        if (mounted) setHealthState('offline');
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleScan() {
    if (!manifest.trim()) {
      setError('Paste or upload a manifest first.');
      return;
    }
    setScanning(true);
    setError('');
    setReport(null);
    try {
      const result = await scanApi(manifest);
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="eyebrow">
          <span className="shield">🛡️</span> ScourMCP
        </div>
        <h1>Scan MCP Tool Manifests for Security Risks</h1>
        <p>
          Paste or upload an MCP server's <code>tools/list</code> response.
          Get instant risk scoring, findings with evidence, and actionable
          remediation steps.
        </p>
        <div className="status-row">
          <span className={`status-dot ${healthState}`} />
          <span>
            Backend: <strong>{healthState}</strong>
          </span>
        </div>
      </header>

      <ManifestInput
        value={manifest}
        onChange={setManifest}
        onScan={handleScan}
        scanning={scanning}
      />

      {error && <div className="error-banner">{error}</div>}

      {report && <ScanReportView report={report} />}

      <footer className="footer">
        <p>
          Deterministic rule-based scanner · No data stored · No LLM calls ·
          Open source
        </p>
      </footer>
    </main>
  );
}
