import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HERO_TOKENS, type HeroToken } from '../data/heroTokens';

interface InteractiveHeroCopyProps {
  onLoadPreset: (
    manifest: string,
    autoScan?: boolean,
    scanResourcesAndPrompts?: boolean,
  ) => void;
  onSwitchView: (view: 'scanner' | 'diff' | 'directory') => void;
  onSelectUrlMode: (defaultUrl?: string) => void;
}

interface PopoverLayout {
  left: number;
  top?: number;
  bottom?: number;
  arrowLeft: number;
  placement: 'top' | 'bottom';
  width: number;
}

export default function InteractiveHeroCopy({
  onLoadPreset,
  onSwitchView,
  onSelectUrlMode,
}: InteractiveHeroCopyProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [popoverLayout, setPopoverLayout] = useState<PopoverLayout | null>(null);
  const [peekLayout, setPeekLayout] = useState<PopoverLayout | null>(null);

  const hoverTimerRef = useRef<number | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const tokensMap = useRef<Map<string, HeroToken>>(
    new Map(HERO_TOKENS.map((t) => [t.id, t])),
  );

  const calculateLayout = useCallback(
    (el: HTMLElement, estWidth: number, estHeight: number): PopoverLayout => {
      const rect = el.getBoundingClientRect();
      const width = Math.min(estWidth, window.innerWidth - 24);
      const buttonCenterX = rect.left + rect.width / 2;
      const left = Math.max(
        12,
        Math.min(buttonCenterX - width / 2, window.innerWidth - width - 12),
      );
      const arrowLeft = Math.max(16, Math.min(buttonCenterX - left, width - 16));

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let placement: 'top' | 'bottom' = 'bottom';
      let top: number | undefined;
      let bottom: number | undefined;

      if (spaceBelow < estHeight && spaceAbove >= spaceBelow) {
        placement = 'top';
        bottom = window.innerHeight - rect.top + 8;
      } else {
        placement = 'bottom';
        top = rect.bottom + 8;
      }

      return { left, top, bottom, arrowLeft, placement, width };
    },
    [],
  );

  // Close pinned popover on Escape or outside click
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (pinnedId) {
          setPinnedId(null);
          setPopoverLayout(null);
          activeTriggerRef.current?.focus();
        } else if (peekId) {
          setPeekId(null);
          setPeekLayout(null);
        }
      }
    }

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (!popoverRef.current) return;
      const target = e.target as Node;
      if (
        !popoverRef.current.contains(target) &&
        !activeTriggerRef.current?.contains(target)
      ) {
        setPinnedId(null);
        setPopoverLayout(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [pinnedId, peekId]);

  // Recalculate layout on window resize/scroll if pinned
  useEffect(() => {
    function handleViewportChange() {
      if (pinnedId && activeTriggerRef.current) {
        setPopoverLayout(
          calculateLayout(activeTriggerRef.current, 450, 420),
        );
      }
      if (peekId && activeTriggerRef.current) {
        setPeekLayout(
          calculateLayout(activeTriggerRef.current, 320, 100),
        );
      }
    }

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange);
    };
  }, [pinnedId, peekId, calculateLayout]);

  const handleTriggerMouseEnter = (
    id: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (pinnedId) return; // Do not show peek tooltip if an item is already pinned
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    const buttonEl = e.currentTarget;
    hoverTimerRef.current = window.setTimeout(() => {
      activeTriggerRef.current = buttonEl;
      setPeekId(id);
      setPeekLayout(calculateLayout(buttonEl, 340, 110));
    }, 150); // 150ms hover-intent delay
  };

  const handleTriggerMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setPeekId(null);
    setPeekLayout(null);
  };

  const handleTriggerFocus = (
    id: string,
    e: React.FocusEvent<HTMLButtonElement>,
  ) => {
    if (pinnedId) return;
    const buttonEl = e.currentTarget;
    activeTriggerRef.current = buttonEl;
    setPeekId(id);
    setPeekLayout(calculateLayout(buttonEl, 340, 110));
  };

  const handleTriggerBlur = () => {
    setPeekId(null);
    setPeekLayout(null);
  };

  const handleTriggerClick = (
    id: string,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setPeekId(null);
    setPeekLayout(null);

    if (pinnedId === id) {
      setPinnedId(null);
      setPopoverLayout(null);
      return;
    }

    const buttonEl = e.currentTarget;
    activeTriggerRef.current = buttonEl;
    setPinnedId(id);
    setCopied(false);
    setPopoverLayout(calculateLayout(buttonEl, 460, 430));
  };

  const handleCopyCli = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteAction = (token: HeroToken) => {
    setPinnedId(null);
    setPopoverLayout(null);

    if (token.actionType === 'load_preset' && token.actionPayload?.manifest) {
      onLoadPreset(
        token.actionPayload.manifest,
        token.actionPayload.autoScan,
        token.actionPayload.scanResourcesAndPrompts,
      );
      // Smoothly scroll down to scanner interface
      const target = document.querySelector('.scanner-card');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (
      token.actionType === 'switch_view' &&
      token.actionPayload?.view
    ) {
      onSwitchView(token.actionPayload.view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (token.actionType === 'url_mode') {
      onSelectUrlMode(token.actionPayload?.url);
      const target = document.querySelector('.scanner-card');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const renderTokenButton = (id: string) => {
    const token = tokensMap.current.get(id);
    if (!token) return null;

    const isPinned = pinnedId === id;
    const isPeeking = peekId === id;

    return (
      <button
        key={id}
        type="button"
        className={`tok-btn ${token.className} ${isPinned ? 'is-pinned' : ''} ${
          isPeeking ? 'is-peeking' : ''
        }`}
        onClick={(e) => handleTriggerClick(id, e)}
        onMouseEnter={(e) => handleTriggerMouseEnter(id, e)}
        onMouseLeave={handleTriggerMouseLeave}
        onFocus={(e) => handleTriggerFocus(id, e)}
        onBlur={handleTriggerBlur}
        aria-haspopup="dialog"
        aria-expanded={isPinned}
        aria-label={`${token.label} (${token.category})`}
        title={`Click to inspect details and try ${token.label}`}
      >
        {token.label}
      </button>
    );
  };

  const activePinnedToken = pinnedId
    ? tokensMap.current.get(pinnedId) ?? null
    : null;
  const activePeekToken =
    !pinnedId && peekId ? tokensMap.current.get(peekId) ?? null : null;

  return (
    <>
      <p className="mcp-copy">
        Audit MCP servers for {renderTokenButton('shell-execution')},{' '}
        {renderTokenButton('credential-access')},{' '}
        {renderTokenButton('prompt-injection')},{' '}
        {renderTokenButton('tool-shadowing')}, and{' '}
        {renderTokenButton('obfuscation')}. Supports{' '}
        {renderTokenButton('format-json')}, {renderTokenButton('format-yaml')},{' '}
        {renderTokenButton('format-jsonl')},{' '}
        {renderTokenButton('claude-config')},{' '}
        {renderTokenButton('live-sse')}, and{' '}
        {renderTokenButton('permission-diff')}.
      </p>

      {/* Stage 1: Peek Tooltip (Non-blocking, hover-intent ~150ms) */}
      {activePeekToken && peekLayout && (
        <div
          className={`tok-peek-tooltip tok-peek-placement-${peekLayout.placement}`}
          style={{
            position: 'fixed',
            left: `${peekLayout.left}px`,
            top: peekLayout.top !== undefined ? `${peekLayout.top}px` : 'auto',
            bottom:
              peekLayout.bottom !== undefined
                ? `${peekLayout.bottom}px`
                : 'auto',
            width: `${peekLayout.width}px`,
            zIndex: 9998,
          }}
          role="tooltip"
          aria-hidden="true"
        >
          <div
            className="tok-popover-arrow"
            style={{ left: `${peekLayout.arrowLeft}px` }}
          />
          <div className="tok-peek-header">
            <span className="tok-category-badge">
              {activePeekToken.category}
            </span>
            <span className="tok-peek-action-hint">Click to inspect</span>
          </div>
          <p className="tok-peek-body">{activePeekToken.peekDescription}</p>
          <div className="tok-peek-artifact">
            <code>{activePeekToken.peekArtifact}</code>
          </div>
        </div>
      )}

      {/* Stage 2: Pinned Popover Card (Modal / Dialog) */}
      {activePinnedToken && popoverLayout && (
        <div
          ref={popoverRef}
          className={`tok-popover-card tok-popover-placement-${popoverLayout.placement}`}
          style={{
            position: 'fixed',
            left: `${popoverLayout.left}px`,
            top:
              popoverLayout.top !== undefined
                ? `${popoverLayout.top}px`
                : 'auto',
            bottom:
              popoverLayout.bottom !== undefined
                ? `${popoverLayout.bottom}px`
                : 'auto',
            width: `${popoverLayout.width}px`,
            zIndex: 9999,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tok-popover-title"
        >
          <div
            className="tok-popover-arrow"
            style={{ left: `${popoverLayout.arrowLeft}px` }}
          />

          {/* Popover Header */}
          <div className="tok-popover-header">
            <div className="tok-popover-title-group">
              <span className="tok-category-badge">
                {activePinnedToken.category}
              </span>
              <h3 id="tok-popover-title" className="tok-popover-title">
                <span className="tok-popover-glyph">
                  {activePinnedToken.glyph}
                </span>{' '}
                {activePinnedToken.label}
              </h3>
            </div>
            <button
              type="button"
              className="tok-popover-close-btn"
              onClick={() => {
                setPinnedId(null);
                setPopoverLayout(null);
                activeTriggerRef.current?.focus();
              }}
              aria-label="Close details"
              title="Close (Escape)"
            >
              ✕
            </button>
          </div>

          {/* Popover Body */}
          <div className="tok-popover-body">
            <p className="tok-popover-desc">
              {activePinnedToken.fullDescription}
            </p>

            {/* CLI Command Box */}
            <div className="tok-popover-section">
              <div className="tok-popover-section-header">
                <span className="tok-section-label">Terminal CLI Command</span>
                <button
                  type="button"
                  className={`tok-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={() => handleCopyCli(activePinnedToken.cliCommand)}
                  title="Copy command to clipboard"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <pre className="tok-popover-code">
                <code>{activePinnedToken.cliCommand}</code>
              </pre>
            </div>

            {/* Example Snippet Box */}
            <div className="tok-popover-section">
              <div className="tok-popover-section-header">
                <span className="tok-section-label">
                  Example Definition / Payload
                </span>
                <span className="tok-syntax-badge">
                  {activePinnedToken.snippetLanguage}
                </span>
              </div>
              <pre className="tok-popover-code tok-popover-snippet">
                <code>{activePinnedToken.codeSnippet}</code>
              </pre>
            </div>
          </div>

          {/* Popover Footer Action */}
          <div className="tok-popover-footer">
            <button
              type="button"
              className="tok-action-btn"
              onClick={() => handleExecuteAction(activePinnedToken)}
            >
              ⚡ {activePinnedToken.actionText}
            </button>
            <span className="tok-footer-hint">
              Press <kbd>Esc</kbd> to close
            </span>
          </div>
        </div>
      )}
    </>
  );
}
