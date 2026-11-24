import { useState, useMemo } from 'react';
import directoryDataRaw from '../data/trust-directory.json';
import Icon, { type IconName } from './Icon';

export interface DirectoryFinding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  evidence: string;
}

export interface DirectoryServer {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  category: string;
  description: string;
  repoUrl: string;
  homepage?: string;
  stars?: number;
  featured?: boolean;
  trustLevel: 'verified' | 'caution' | 'dangerous';
  riskScore: number;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  manifestFingerprint: string;
  toolsCount: number;
  findingsCount: number;
  permissionBadges: string[];
  toolsSummary: string[];
  topFindings: DirectoryFinding[];
  sampleManifest: unknown;
  scannedAt: string;
}

export interface DirectoryDataset {
  version: string;
  generatedAt: string;
  totalServers: number;
  stats: {
    verifiedCount: number;
    cautionCount: number;
    dangerousCount: number;
    avgRiskScore: number;
  };
  categories: string[];
  servers: DirectoryServer[];
}

const directoryData = directoryDataRaw as unknown as DirectoryDataset;

interface TrustDirectoryProps {
  onInspectServer: (manifestJsonString: string) => void;
}

export default function TrustDirectory({ onInspectServer }: TrustDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTrustLevel, setSelectedTrustLevel] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'risk-asc' | 'risk-desc' | 'name' | 'tools'>('featured');
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [copiedFingerprint, setCopiedFingerprint] = useState<string | null>(null);

  const { stats, categories, servers } = directoryData;

  const filteredServers = useMemo(() => {
    return servers
      .filter((server) => {
        // Category filter
        if (selectedCategory !== 'All' && server.category !== selectedCategory) {
          return false;
        }

        // Trust Level filter
        if (selectedTrustLevel !== 'All' && server.trustLevel !== selectedTrustLevel) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = server.displayName.toLowerCase().includes(q) || server.name.toLowerCase().includes(q);
          const matchesDesc = server.description.toLowerCase().includes(q);
          const matchesPublisher = server.publisher.toLowerCase().includes(q);
          const matchesTools = server.toolsSummary.some((t) => t.toLowerCase().includes(q));
          const matchesBadges = server.permissionBadges.some((b) => b.toLowerCase().includes(q));

          return matchesName || matchesDesc || matchesPublisher || matchesTools || matchesBadges;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk-asc') return a.riskScore - b.riskScore;
        if (sortBy === 'risk-desc') return b.riskScore - a.riskScore;
        if (sortBy === 'name') return a.displayName.localeCompare(b.displayName);
        if (sortBy === 'tools') return b.toolsCount - a.toolsCount;
        // Default: featured first, then risk score ascending
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.riskScore - b.riskScore;
      });
  }, [servers, searchQuery, selectedCategory, selectedTrustLevel, sortBy]);

  function handleCopyFingerprint(fp: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(fp).then(() => {
      setCopiedFingerprint(fp);
      setTimeout(() => setCopiedFingerprint(null), 2000);
    });
  }

  function handleInspect(server: DirectoryServer) {
    const jsonStr = JSON.stringify(server.sampleManifest, null, 2);
    onInspectServer(jsonStr);
  }

  return (
    <div className="directory-container">
      {/* Ecosystem Stats Banner */}
      <div className="card directory-stats-card">
        <div className="directory-stats-header">
          <div>
            <h2>
              <Icon name="library" size={20} /> Curated MCP Trust Directory
            </h2>
            <p className="directory-subtitle">
              Pre-audited public MCP servers harvested from ecosystem registries with cryptographic SHA-256 fingerprints, risk scores, and permission threat breakdowns.
            </p>
          </div>
          <span className="directory-version-pill">v{directoryData.version} · {directoryData.totalServers ?? servers.length} Audited</span>
        </div>

        <div className="directory-metrics-grid">
          <div className="metric-box">
            <span className="metric-num">{servers.length}</span>
            <span className="metric-label">Audited Servers</span>
          </div>
          <div className="metric-box metric-verified">
            <span className="metric-num">{stats.verifiedCount}</span>
            <span className="metric-label">
              <Icon name="check-circle" size={13} /> Verified Safe
            </span>
          </div>
          <div className="metric-box metric-caution">
            <span className="metric-num">{stats.cautionCount}</span>
            <span className="metric-label">
              <Icon name="warning" size={13} /> Caution
            </span>
          </div>
          <div className="metric-box metric-dangerous">
            <span className="metric-num">{stats.dangerousCount}</span>
            <span className="metric-label">
              <Icon name="critical" size={13} /> Avoid / High Risk
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-num">{stats.avgRiskScore}<span className="metric-denom">/100</span></span>
            <span className="metric-label">Ecosystem Avg Risk</span>
          </div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="card directory-controls-card">
        <div className="search-bar-row">
          <div className="search-input-wrap">
            <span className="search-icon">
              <Icon name="search" size={14} />
            </span>
            <input
              type="text"
              className="directory-search-input"
              placeholder="Search servers by name, tool (e.g. 'read_file', 'query'), permission, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          <div className="sort-dropdown-wrap">
            <label htmlFor="directory-sort" className="sort-label">Sort:</label>
            <select
              id="directory-sort"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="featured">Featured / Recommended</option>
              <option value="risk-asc">Risk: Low to High (Safest)</option>
              <option value="risk-desc">Risk: High to Low (Riskiest)</option>
              <option value="name">Alphabetical (A–Z)</option>
              <option value="tools">Tool Count (Most to Least)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="filter-groups">
          <div className="filter-group">
            <span className="filter-group-title">Category:</span>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('All')}
              >
                All ({servers.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat} ({servers.filter((s) => s.category === cat).length})
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group-title">Trust Rating:</span>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${selectedTrustLevel === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedTrustLevel('All')}
              >
                All Levels
              </button>
              <button
                type="button"
                className={`filter-chip chip-verified ${selectedTrustLevel === 'verified' ? 'active' : ''}`}
                onClick={() => setSelectedTrustLevel('verified')}
              >
                <Icon name="check-circle" size={13} /> Verified Safe ({stats.verifiedCount})
              </button>
              <button
                type="button"
                className={`filter-chip chip-caution ${selectedTrustLevel === 'caution' ? 'active' : ''}`}
                onClick={() => setSelectedTrustLevel('caution')}
              >
                <Icon name="warning" size={13} /> Caution ({stats.cautionCount})
              </button>
              <button
                type="button"
                className={`filter-chip chip-dangerous ${selectedTrustLevel === 'dangerous' ? 'active' : ''}`}
                onClick={() => setSelectedTrustLevel('dangerous')}
              >
                <Icon name="critical" size={13} /> Dangerous ({stats.dangerousCount})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="directory-results-meta">
        <span>Showing <strong>{filteredServers.length}</strong> of <strong>{servers.length}</strong> audited MCP servers</span>
        {(searchQuery || selectedCategory !== 'All' || selectedTrustLevel !== 'All') && (
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedTrustLevel('All');
            }}
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Server Cards Grid */}
      {filteredServers.length === 0 ? (
        <div className="card directory-empty-card">
          <p className="empty-title">No MCP servers match your criteria</p>
          <p className="empty-sub">Try adjusting your search terms or clearing active filters.</p>
          <button
            type="button"
            className="btn-sm btn-outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedTrustLevel('All');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="directory-cards-grid">
          {filteredServers.map((server) => {
            const isExpanded = expandedServerId === server.id;
            const trustBadgeClass =
              server.trustLevel === 'verified'
                ? 'trust-badge-verified'
                : server.trustLevel === 'caution'
                ? 'trust-badge-caution'
                : 'trust-badge-dangerous';

            const trustBadgeIcon: IconName =
              server.trustLevel === 'verified'
                ? 'check-circle'
                : server.trustLevel === 'caution'
                ? 'warning'
                : 'critical';

            const trustLabelText =
              server.trustLevel === 'verified'
                ? 'Verified Safe'
                : server.trustLevel === 'caution'
                ? 'Caution'
                : 'Avoid / High Risk';

            return (
              <div key={server.id} className={`card server-card ${server.trustLevel}`}>
                <div className="server-card-header">
                  <div>
                    <div className="server-title-row">
                      <h3 className="server-name">{server.displayName}</h3>
                      {server.featured && <span className="featured-pill">Featured</span>}
                    </div>
                    <div className="server-meta">
                      <span className="server-publisher">{server.publisher}</span>
                      <span className="meta-sep">·</span>
                      <span className="server-category-pill">{server.category}</span>
                    </div>
                  </div>

                  <div className="server-badges">
                    <span className={`trust-badge ${trustBadgeClass}`}>
                      <Icon name={trustBadgeIcon} size={13} /> {trustLabelText}
                    </span>
                    <span className={`risk-pill risk-${server.overallRisk}`}>
                      Score {server.riskScore}/100
                    </span>
                  </div>
                </div>

                <p className="server-description">{server.description}</p>

                {/* Permission Tags */}
                <div className="permission-tags-row">
                  <span className="tags-label">Permissions:</span>
                  {server.permissionBadges.map((badge) => {
                    let badgeClass = 'perm-tag-neutral';
                    if (badge.includes('Shell') || badge.includes('Injection')) badgeClass = 'perm-tag-critical';
                    else if (badge.includes('Filesystem') || badge.includes('Credential') || badge.includes('Network')) badgeClass = 'perm-tag-warn';
                    else if (badge.includes('Read-Only') || badge.includes('Sandboxed')) badgeClass = 'perm-tag-safe';

                    return (
                      <span key={badge} className={`perm-tag ${badgeClass}`}>
                        {badge}
                      </span>
                    );
                  })}
                </div>

                {/* Tools Preview */}
                <div className="tools-preview-row">
                  <span className="tools-preview-label">Declared Tools ({server.toolsCount}):</span>
                  <div className="tools-chips-list">
                    {server.toolsSummary.map((toolName) => (
                      <code key={toolName} className="tool-chip">{toolName}</code>
                    ))}
                  </div>
                </div>

                {/* Fingerprint snippet */}
                <div className="server-fingerprint-row">
                  <span className="fp-label">SHA-256:</span>
                  <code className="fp-code" title={server.manifestFingerprint}>
                    {server.manifestFingerprint.slice(0, 24)}...
                  </code>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={(e) => handleCopyFingerprint(server.manifestFingerprint, e)}
                    title="Copy full SHA-256 fingerprint"
                  >
                    {copiedFingerprint === server.manifestFingerprint ? (
                      <>
                        <Icon name="check" size={12} /> Copied
                      </>
                    ) : (
                      <>
                        <Icon name="copy" size={12} /> Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Audit Findings Drawer (Expanded) */}
                {isExpanded && (
                  <div className="quick-audit-drawer">
                    <div className="drawer-header">
                      <h4>Security Findings ({server.findingsCount})</h4>
                      <span className="drawer-scanned-date">Audited: {new Date(server.scannedAt).toLocaleDateString()}</span>
                    </div>

                    {server.topFindings.length === 0 ? (
                      <div className="drawer-clean-message">
                        <Icon name="shield" size={14} /> Zero dangerous patterns detected. Clean deterministic audit.
                      </div>
                    ) : (
                      <ul className="drawer-findings-list">
                        {server.topFindings.map((finding, idx) => (
                          <li key={idx} className={`drawer-finding-item finding-${finding.severity}`}>
                            <div className="finding-headline">
                              <span className={`finding-sev-pill sev-${finding.severity}`}>{finding.severity}</span>
                              <span className="finding-rule-title">{finding.title}</span>
                              <code className="finding-rule-id">[{finding.ruleId}]</code>
                            </div>
                            <div className="finding-evidence-snippet">{finding.evidence}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Action Footer */}
                <div className="server-card-actions">
                  <button
                    type="button"
                    className="btn-sm btn-outline toggle-audit-btn"
                    onClick={() => setExpandedServerId(isExpanded ? null : server.id)}
                  >
                    {isExpanded ? (
                      <>
                        Hide Audit Details <Icon name="chevron-up" size={12} />
                      </>
                    ) : (
                      <>
                        View Audit Findings ({server.findingsCount}) <Icon name="chevron-down" size={12} />
                      </>
                    )}
                  </button>

                  <div className="card-right-actions">
                    <a
                      href={server.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-sm btn-outline repo-link"
                    >
                      GitHub Repo <Icon name="external-link" size={12} />
                    </a>
                    <button
                      type="button"
                      className="btn-sm btn-primary inspect-scanner-btn"
                      onClick={() => handleInspect(server)}
                      title="Load this manifest into the Scanner and run a fresh audit"
                    >
                      <Icon name="search" size={13} /> Inspect in Scanner
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
