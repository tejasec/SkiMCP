import { useEffect, useState } from 'react';
import {
  scanManifest as scanApi,
  scanUrl as scanUrlApi,
  type ScanReport,
} from './lib/api';
import ManifestInput from './components/ManifestInput';
import ScanReportView from './components/ScanReport';
import PermissionDiff from './components/PermissionDiff';
import TrustDirectory from './components/TrustDirectory';
import ScanHistory from './components/ScanHistory';
import EmbedWidget from './components/EmbedWidget';
import { saveScanToHistory } from './lib/history';
import directoryDataRaw from './data/trust-directory.json';
import InteractiveHeroCopy from './components/InteractiveHeroCopy';
import Icon from './components/Icon';

type ScanMode = 'manifest' | 'url';
type ActiveView = 'scanner' | 'diff' | 'directory';

export default function App() {
  // Check if loaded in embed mode
  const isEmbed =
    window.location.pathname.startsWith('/embed') ||
    new URLSearchParams(window.location.search).get('embed') === 'true' ||
    window.location.hash.startsWith('#embed');

  if (isEmbed) {
    return <EmbedWidget />;
  }

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('skimcp-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skimcp-theme', theme);
  }, [theme]);

  const [activeView, setActiveView] = useState<ActiveView>('scanner');
  const [manifest, setManifest] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [scanMode, setScanMode] = useState<ScanMode>('url');
  const [scanResourcesAndPrompts, setScanResourcesAndPrompts] = useState(false);
  const [runCanaryProbes, setRunCanaryProbes] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  // States for pre-populating diff from history compare
  const [diffBaseline, setDiffBaseline] = useState<string | undefined>(undefined);
  const [diffTarget, setDiffTarget] = useState<string | undefined>(undefined);

  const totalCuratedServers =
    (directoryDataRaw as { totalServers?: number }).totalServers || 16;

  // Window-level Scroll Progress Bar (scrollbar.txt)
  useEffect(() => {
    const updateProgress = () => {
      const progressBar = document.getElementById('progressBar');
      if (!progressBar) return;
      const totalPageHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalPageHeight <= 0) {
        progressBar.style.height = '0%';
        progressBar.style.opacity = '0';
        return;
      }
      const scrollY =
        window.pageYOffset ||
        window.scrollY ||
        document.documentElement.scrollTop;
      const progressPercent = Math.min(
        Math.max(scrollY / totalPageHeight, 0),
        1
      ) * 100;
      progressBar.style.height = `${progressPercent}%`;
      progressBar.style.opacity =
        progressPercent > 0
          ? `${Math.min(progressPercent / 15 + 0.35, 1)}`
          : '0';
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    const observer = new ResizeObserver(updateProgress);
    observer.observe(document.body);

    updateProgress();

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
      observer.disconnect();
    };
  }, [activeView, report]);

  async function handleScan(customManifest?: string) {
    setError('');
    setReport(null);

    const manifestToScan =
      typeof customManifest === 'string' ? customManifest : manifest;

    if (scanMode === 'manifest') {
      if (!manifestToScan.trim()) {
        setError('Paste or upload a manifest first.');
        return;
      }
    } else {
      if (!urlValue.trim()) {
        setError('Enter a live MCP server URL first.');
        return;
      }
    }

    setScanning(true);
    try {
      let result: ScanReport;
      if (scanMode === 'manifest') {
        result = await scanApi(manifestToScan, { scanResourcesAndPrompts });
      } else {
        result = await scanUrlApi(urlValue.trim(), {
          scanResourcesAndPrompts,
          runCanaryProbes,
        });
      }
      setReport(result);

      // Save to browser history (F-12)
      saveScanToHistory({
        source: scanMode === 'manifest' ? 'pasted' : 'url',
        sourceLabel: scanMode === 'url' ? urlValue.trim() : 'Pasted Manifest',
        manifestFingerprint: result.manifestFingerprint,
        toolFingerprints: result.toolFingerprints || {},
        riskScore: result.summary.riskScore,
        overallRisk: result.summary.overallRisk,
        totalTools: result.summary.totalTools,
        totalFindings: result.summary.totalFindings,
        rawManifest:
          scanMode === 'manifest'
            ? manifestToScan
            : JSON.stringify({ tools: result.tools }, null, 2),
      });
      setHistoryKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function handleInspectServerFromDirectory(manifestJsonString: string) {
    setManifest(manifestJsonString);
    setScanMode('manifest');
    setActiveView('scanner');
    handleScan(manifestJsonString);
  }

  return (
    <>
      <div id="progressBarContainer">
        <div id="progressBar" />
      </div>
      <main className="shell">
      <header className="hero">
        <div className="hero-top-bar">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <>
                <Icon name="moon" size={14} /> Dark
              </>
            ) : (
              <>
                <Icon name="sun" size={14} /> Light
              </>
            )}
          </button>
        </div>
        <h1>Scan MCP Tool Manifests for Security Risks</h1>
        <InteractiveHeroCopy
          onLoadPreset={(customManifest, autoScan, scanResources) => {
            setManifest(customManifest);
            setScanMode('manifest');
            setActiveView('scanner');
            if (scanResources !== undefined) {
              setScanResourcesAndPrompts(scanResources);
            }
            if (autoScan) {
              handleScan(customManifest);
            }
          }}
          onSwitchView={(view) => setActiveView(view)}
          onSelectUrlMode={(defaultUrl) => {
            setActiveView('scanner');
            setScanMode('url');
            if (defaultUrl) {
              setUrlValue(defaultUrl);
            }
          }}
        />

        {/* Primary View Switcher Navigation */}
        <nav className="view-navigation-bar">
          <button
            type="button"
            className={`view-nav-btn ${activeView === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveView('scanner')}
          >
            <Icon name="search" size={15} /> Live Manifest Scanner
          </button>
          <button
            type="button"
            className={`view-nav-btn ${activeView === 'diff' ? 'active' : ''}`}
            onClick={() => setActiveView('diff')}
          >
            <Icon name="diff" size={15} /> Permission Diff (v1 vs v2)
          </button>
          <button
            type="button"
            className={`view-nav-btn ${activeView === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveView('directory')}
          >
            <Icon name="library" size={15} /> Curated Trust Directory{' '}
            <span className="nav-count-badge">{totalCuratedServers}</span>
          </button>
        </nav>
      </header>

      {activeView === 'scanner' ? (
        <>
          <ManifestInput
            value={manifest}
            onChange={setManifest}
            urlValue={urlValue}
            onUrlChange={setUrlValue}
            scanMode={scanMode}
            onScanModeChange={setScanMode}
            scanResourcesAndPrompts={scanResourcesAndPrompts}
            onScanResourcesAndPromptsChange={setScanResourcesAndPrompts}
            runCanaryProbes={runCanaryProbes}
            onRunCanaryProbesChange={setRunCanaryProbes}
            onExploreDirectory={() => setActiveView('directory')}
            onScan={() => handleScan()}
            scanning={scanning}
          />

          {error && <div className="error-banner">{error}</div>}

          {report && (
            <ScanReportView report={report} rawManifestInput={manifest} />
          )}

          <ScanHistory
            key={historyKey}
            onLoadManifest={(raw) => {
              setManifest(raw);
              setScanMode('manifest');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCompare={(baseline, target) => {
              setDiffBaseline(baseline);
              setDiffTarget(target);
              setActiveView('diff');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      ) : activeView === 'diff' ? (
        <PermissionDiff
          initialBaseline={diffBaseline}
          initialTarget={diffTarget}
        />
      ) : (
        <TrustDirectory onInspectServer={handleInspectServerFromDirectory} />
      )}

      <footer className="footer">
        <p>
          Deterministic rule-based scanner · Cryptographic SHA-256 fingerprints ·
          Permission Diff & Drift · One-Click Hardening · No data stored · No LLM calls
        </p>
      </footer>
    </main>
  </>
  );
}
