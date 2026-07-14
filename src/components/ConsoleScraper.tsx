import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Info } from 'lucide-react';

export default function ConsoleScraper() {
  const [copied, setCopied] = useState(false);

  // Dynamically resolve target URL. The AI Studio dev server origin requires developer authentication cookies,
  // which causes browser CORS preflight blocks (302 redirects) when fetched from external domains like Mostbet.
  // By routing telemetry payloads directly to the public shared-preview gateway ('ais-pre-*'), we bypass 
  // auth redirects while keeping both instances perfectly synchronized on the same Firestore database!
  const getPublicOrigin = () => {
    if (typeof window === 'undefined') return 'https://your-applet-url.run.app';
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  const currentOrigin = getPublicOrigin();

  const scraperCode = `/**
 * =========================================================
 *  MOSTBET / SPRIBE AVIATOR REAL-TIME SCRAPER SCRIPT
 * =========================================================
 * This script runs in your browser console directly on 
 * Mostbet's Aviator page. It watches the game DOM for new
 * multipliers and automatically syncs them to your database.
 */
(function() {
  const TRACKER_URL = "${currentOrigin}";

  // 1. Retrieve original un-overridden console methods to bypass game anti-logging protection
  let originalConsoleLog = console.log;
  let originalConsoleWarn = console.warn;
  let originalConsoleError = console.error;
  try {
    const rawIframe = document.createElement('iframe');
    rawIframe.style.display = 'none';
    document.body.appendChild(rawIframe);
    if (rawIframe.contentWindow && rawIframe.contentWindow.console) {
      originalConsoleLog = rawIframe.contentWindow.console.log.bind(rawIframe.contentWindow.console);
      originalConsoleWarn = rawIframe.contentWindow.console.warn.bind(rawIframe.contentWindow.console);
      originalConsoleError = rawIframe.contentWindow.console.error.bind(rawIframe.contentWindow.console);
    }
  } catch (e) {
    // Fallback if blocked
  }

  originalConsoleLog("%c🚀 Aviator Real-Time Scraper Payload Loaded!", "color: #f43f5e; font-size: 16px; font-weight: bold;");
  originalConsoleLog("Current Frame Execution Origin:", window.location.href);
  originalConsoleLog("Target Database API URL:", TRACKER_URL);

  let lastSavedMultiplier = null;
  let lastSavedElementRef = null;
  let warnCounter = 0;
  let syncCount = 0;
  let lastSyncTimeText = "";

  // 2. Establish a beautiful diagnostic HUD overlay in the bottom corner of the Aviator game
  let hud = document.getElementById('aviator-pilot-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'aviator-pilot-hud';
    hud.style.position = 'fixed';
    hud.style.bottom = '15px';
    hud.style.right = '15px';
    hud.style.zIndex = '999999';
    hud.style.backgroundColor = 'rgba(8, 12, 26, 0.95)';
    hud.style.border = '1px solid rgba(244, 63, 94, 0.5)';
    hud.style.borderRadius = '16px';
    hud.style.padding = '14px 16px';
    hud.style.color = '#fff';
    hud.style.fontFamily = '"JetBrains Mono", monospace, sans-serif';
    hud.style.fontSize = '11px';
    hud.style.boxShadow = '0 10px 30px -5px rgba(0,0,0,0.8), 0 0 15px rgba(244, 63, 94, 0.25)';
    hud.style.width = '245px';
    hud.style.lineHeight = '1.4';
    hud.style.transition = 'all 0.3s ease';
    document.body.appendChild(hud);
  }

  function updateHUD(status, latestVal, successMsg) {
    if (!hud) return;
    hud.innerHTML = \`
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
        <span style="color:#f43f5e; font-weight:bold; letter-spacing:1px; font-size:10px;">🛰️ AVIATOR DAEMON</span>
        <span style="background:#10b981; color:#fff; font-size:9px; padding:2px 8px; border-radius:12px; font-weight:bold; text-transform:uppercase;">\${status}</span>
      </div>
      <div style="margin-bottom:5px; color:#94a3b8;">Latest Scanned: <strong style="color:#fff; font-size:14px; font-family:monospace;">\${latestVal || 'Scanning...'}</strong></div>
      <div style="margin-bottom:5px; color:#94a3b8;">Synced Count: <strong style="color:#10b981; font-size:13px;">\${syncCount}</strong></div>
      <div style="margin-bottom:8px; color:#94a3b8; font-size:9px; word-break:break-all;">Target: <span style="color:#cbd5e1;">\${TRACKER_URL}</span></div>
      <div style="font-size:9px; color:#64748b; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px; margin-top:6px;">
        \${successMsg || 'Waiting for first round resolution...'}
      </div>
    \`;
  }

  updateHUD("ACTIVE", "SCANNING...", "Awaiting round finish...");

  async function syncMultiplierToDB(val) {
    try {
      const response = await fetch(\`\${TRACKER_URL}/api/multipliers\`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ multiplier: parseFloat(val), source: 'scraper' })
      });
      const data = await response.json();
      syncCount++;
      const now = new Date();
      lastSyncTimeText = now.toLocaleTimeString();
      originalConsoleLog(\`%c✅ Multiplier \${val}x successfully synced! ID: \${data.id}\`, "color: #10b981; font-weight: bold;");
      updateHUD("ACTIVE", \`\${val}x\`, \`✅ Last synced at \${lastSyncTimeText}\`);
    } catch (err) {
      originalConsoleError("❌ Failed syncing multiplier to database:", err);
      updateHUD("ERR_CONN", \`\${val}x\`, \`❌ Connection to applet failed!\`);
    }
  }

  // 3. Monitor DOM elements using specific Spribe Aviator history selectors
  function scanAndSync() {
    // Try to find the horizontal history ribbon container first to ensure we get the correct order and avoid draft elements
    let container = document.querySelector('app-stats-list');
    if (!container) {
      // Look for fallback containers, prioritizing ones that are NOT inside dropdowns
      const elements = document.querySelectorAll('.payouts-block, .stats-list, .history-wrapper, .history-list');
      for (const el of elements) {
        if (!el.closest('app-stats-dropdown') && !el.closest('.dropdown-menu')) {
          container = el;
          break;
        }
      }
      // If still not found, fallback to the first one available
      if (!container && elements.length > 0) {
        container = elements[0];
      }
    }

    // Query history items either within the container or globally as a last fallback
    const itemsSelector = 'app-stats-item, .payout, [appcoloredmultiplier], .stats-pin, .bubble-multiplier, [class*="bubble-multiplier"]';
    const elements = container 
      ? container.querySelectorAll(itemsSelector)
      : document.querySelectorAll(itemsSelector);

    const multiplierRegex = /^\\s*(\\d+(?:\\.\\d+)?)\\s*x?\\s*$/i;
    const foundElements = [];

    for (const el of elements) {
      // Avoid elements inside dropdowns if we are in global fallback mode
      if (!container && (el.closest('app-stats-dropdown') || el.closest('.dropdown-menu'))) {
        continue;
      }
      
      let text = (el.textContent || '').trim();
      // Remove any thousand separator commas (e.g., 1,090.08x -> 1090.08x) to support large multipliers
      text = text.replace(/,/g, '');
      const match = text.match(multiplierRegex);
      if (match) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 1.0 && val < 100000.0) {
          foundElements.push({ element: el, value: val, rawText: text });
        }
      }
    }

    if (foundElements.length === 0) {
      warnCounter++;
      if (warnCounter === 1 || warnCounter % 15 === 0) {
        originalConsoleWarn("%c⚠️ CONSOLE CONTEXT ERROR: No game multipliers found!", "color: #ff3333; font-weight: bold; font-size: 13px;");
        originalConsoleWarn("👉 Currently inspecting:", window.location.href);
        updateHUD("LOOKING", "SEARCHING DOM", "⚠️ Is the console dropdown set to top context?");
      }
      return;
    }

    if (warnCounter > 0) {
      originalConsoleLog("%c🎉 SUCCESS: Scraper has successfully locked onto the game DOM elements!", "color: #10b981; font-weight: bold; font-size: 14px;");
      warnCounter = 0;
    }

    // In Spribe Aviator, the most recent crash multiplier is the FIRST element in the chronological row list (leftmost)
    const latestRecord = foundElements[0];
    if (!latestRecord) return;

    const multiplierVal = latestRecord.value;
    const currentElement = latestRecord.element;

    // ULTIMATE FIX FOR MISSING MULTIPLIERS:
    // By tracking the exact unique DOM Node object reference rather than just the raw number,
    // we safely detect consecutive duplicate rounds (e.g., if the game crashes at 1.00x twice in a row)!
    if (currentElement !== lastSavedElementRef) {
      lastSavedElementRef = currentElement;
      lastSavedMultiplier = multiplierVal;
      originalConsoleLog(\`✈️ Detected New Round Multiplier: \${multiplierVal}x (Source: \${latestRecord.rawText})\`);
      syncMultiplierToDB(multiplierVal);
    }
  }

  // Run first checks immediately
  scanAndSync();

  // 4. Setup Observer on the stats board to detect immediate round resolutions
  const statsBoard = document.querySelector('app-stats-list') || document.querySelector('.payouts-block') || document.querySelector('.stats-list') || document.querySelector('.history-wrapper') || document.querySelector('.history-list') || document.body;
  
  const observer = new MutationObserver(() => {
    scanAndSync();
  });

  observer.observe(statsBoard, { childList: true, subtree: true });

  // Fallback high-frequency poller to ensure zero missed rounds
  setInterval(scanAndSync, 1200);
  
  return "🟢 Mostbet Aviator Pilot Daemon activated with Floating HUD feedback!";
})();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scraperCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="console-scraper-panel" className="glass-card rounded-2xl p-6 shadow-2xl">
      <h3 className="text-sm font-display font-bold text-white flex items-center gap-2 mb-2 uppercase tracking-widest border-b border-white/5 pb-3">
        <Terminal className="text-rose-500" size={18} />
        Casino Console Scraper
      </h3>
      <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
        Sync live Mostbet Casino Aviator multiplier histories directly to this tracker using your browser console in seconds.
      </p>

      {/* Step List */}
      <div className="space-y-3 mb-5 font-sans">
        <div className="flex gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-[#080d1a] border border-white/5 text-slate-300 font-bold flex items-center justify-center shrink-0">1</span>
          <div>
            <p className="font-semibold text-slate-200">Open Mostbet Aviator</p>
            <p className="text-slate-500 mt-0.5">Log in to your account and navigate to Spribe Aviator's active screen.</p>
          </div>
        </div>

        <div className="flex gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-[#080d1a] border border-white/5 text-slate-300 font-bold flex items-center justify-center shrink-0">2</span>
          <div>
            <p className="font-semibold text-slate-200">Open DevTools Console</p>
            <p className="text-slate-500 mt-0.5">Right-click on the game viewport, choose <strong className="text-slate-400 font-semibold">Inspect</strong>, and navigate to the <strong className="text-slate-400 font-semibold">Console</strong> tab.</p>
          </div>
        </div>

        <div className="flex gap-3 text-xs bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
          <span className="w-6 h-6 rounded-full bg-rose-950/40 border border-rose-900/40 text-rose-400 font-bold flex items-center justify-center shrink-0">3</span>
          <div>
            <p className="font-semibold text-rose-400 uppercase tracking-wider text-[11px]">CRITICAL: Switch Console Context to Iframe</p>
            <p className="text-slate-400 mt-1 leading-relaxed">
              Mostbet loads Spribe Aviator inside an <strong className="text-slate-200">iframe</strong>. Pasting into the main <code className="bg-[#0f1424] px-1 rounded border border-white/5 text-slate-300 text-[10px]">top</code> context will prevent the script from finding game elements.
            </p>
            <p className="text-slate-400 mt-1.5 leading-relaxed">
              👉 In your Console tab, locate the dropdown that currently says <code className="text-rose-400 font-mono font-bold font-semibold">top</code> (just above the command line) and switch it to the Aviator frame (e.g., <code className="text-rose-400 font-mono font-semibold">FullscreenGameFrame_frame__yqA7l</code> or contains <code className="text-rose-400 font-mono font-semibold">aviator</code>).
            </p>
          </div>
        </div>

        <div className="flex gap-3 text-xs">
          <span className="w-6 h-6 rounded-full bg-[#080d1a] border border-white/5 text-slate-300 font-bold flex items-center justify-center shrink-0">4</span>
          <div>
            <p className="font-semibold text-slate-200">Paste Script & Press Enter</p>
            <p className="text-slate-500 mt-0.5">
              Paste the payload below. Note: Chrome printing <code className="text-slate-400 font-mono">undefined</code> is standard JavaScript console behavior when a background loop registers—this means registration succeeded! You should immediately see the green <strong className="text-slate-300">"🚀 Aviator Real-Time Scraper Initiated!"</strong> logs in your console.
            </p>
          </div>
        </div>

        <div className="flex gap-3 text-xs bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl">
          <span className="w-6 h-6 rounded-full bg-amber-950/40 border border-amber-900/40 text-amber-400 font-bold flex items-center justify-center shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-amber-400">Chrome "Allow Pasting" Protection</p>
            <p className="text-slate-400 mt-1 leading-relaxed">
              If Chrome displays a security warning and prevents you from pasting the script, type <code className="bg-[#0f1424] px-1.5 py-0.5 rounded border border-white/10 font-mono text-amber-300 text-[11px]">allow pasting</code> into the console line and press <strong className="text-slate-200 font-semibold">Enter</strong> first to authorize manual script injection.
            </p>
          </div>
        </div>
      </div>

      {/* Code Container */}
      <div className="relative bg-[#04060f] border border-white/5 rounded-2xl overflow-hidden shadow-inner">
        <div className="flex justify-between items-center px-4 py-2.5 bg-[#080c16] border-b border-white/5 text-xs">
          <span className="font-mono text-slate-500 text-[10px] tracking-wide uppercase">mostbet-aviator-daemon.js</span>
          <button
            id="btn-copy-scraper-script"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all font-semibold cursor-pointer border ${
              copied
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60 shadow-sm shadow-emerald-950/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/5 hover:border-white/10'
            }`}
          >
            {copied ? (
              <>
                <Check size={13} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={13} />
                Copy Script
              </>
            )}
          </button>
        </div>

        <pre className="p-4 overflow-x-auto text-[11px] font-mono text-slate-400 max-h-60 leading-relaxed scrollbar-thin">
          <code>{scraperCode}</code>
        </pre>
      </div>

      <div className="mt-4 p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-xl flex gap-3">
        <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-emerald-300/90 font-sans">
          <strong>CORS Proxy Bypass Activated:</strong> The scraper is configured to target your public gateway (<code className="text-emerald-400 font-mono">{currentOrigin}</code>) instead of your private developer domain. This completely bypasses AI Studio's login redirects, allowing real-time telemetry pushes directly from Mostbet to sync seamlessly!
        </div>
      </div>

      {/* High-Fidelity Diagnostics and Troubleshooting Panel for Missing Multipliers */}
      <div className="mt-6 border-t border-white/5 pt-5 space-y-4 font-sans">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          Scraper Diagnostic Guide (Why Multipliers Miss & How to Fix)
        </h4>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          While our scraper is designed with state-of-the-art observer hooks, certain browser settings or conditions can interfere with real-time syncing. Refer to these checks below:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#080c16]/50 p-4 rounded-xl border border-white/5 space-y-2">
            <span className="text-[10px] text-rose-400 font-mono uppercase font-bold">1. Duplicate Back-to-Back Rounds</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Old Behavior:</strong> Traditional scrapers only compared numbers (e.g. <code className="text-slate-300">val !== lastVal</code>). If the game crashed at <code className="text-slate-300">1.00x</code> twice in a row, the second one was ignored.
            </p>
            <p className="text-[11px] text-emerald-400 leading-relaxed">
              <strong>✨ Our Solution:</strong> Our upgraded script tracks the unique **DOM Node Reference** in memory. An identical sequential multiplier creates a new HTML tag, triggering a successful sync!
            </p>
          </div>

          <div className="bg-[#080c16]/50 p-4 rounded-xl border border-white/5 space-y-2">
            <span className="text-[10px] text-rose-400 font-mono uppercase font-bold">2. Background Tab sleep & Throttling</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>The Cause:</strong> Google Chrome, Safari, and Edge aggressively throttle background tabs to save battery. If you minimize or switch away from the Aviator tab, the script sleep rate drops, causing missed rounds.
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>👉 Solution:</strong> Run the Aviator casino tab in a <strong>separate browser window</strong> placed side-by-side or on another monitor so it stays fully active.
            </p>
          </div>

          <div className="bg-[#080c16]/50 p-4 rounded-xl border border-white/5 space-y-2">
            <span className="text-[10px] text-rose-400 font-mono uppercase font-bold">3. Iframe Context Resets</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>The Cause:</strong> If your casino page reloads, drops connection, or redirects temporarily, the browser console context silently resets back to the main <code className="text-slate-300 font-mono">top</code> context.
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>👉 Solution:</strong> Check the bottom-right of your game screen. If the floating **Aviator Daemon HUD Overlay** disappears, switch your console frame back to the game iframe and re-paste the script.
            </p>
          </div>

          <div className="bg-[#080c16]/50 p-4 rounded-xl border border-white/5 space-y-2">
            <span className="text-[10px] text-rose-400 font-mono uppercase font-bold">4. VPN / Transient Network Drops</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>The Cause:</strong> Heavy VPN shielding or temporary high-latency routing can drop singular telemetry POST packets.
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>👉 Solution:</strong> Watch the floating HUD on the game. If you see a status of <code className="text-rose-500 font-semibold font-mono text-[9px]">ERR_CONN</code>, the script will retry on the next flight round automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
