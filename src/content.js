/**
 * BeeCommit — Content Script
 *
 * Runs on Beecrowd pages. Provides manual sync controls for accepted
 * submissions. Works in two contexts:
 *
 * 1. Runs page (/runs) — adds 🐝 sync buttons next to each "Accepted" verdict
 * 2. Code page (/runs/code/{RUN_ID}) — shows a floating sync button if Accepted
 */

(() => {
    'use strict';

    // Avoid double-injection
    if (window.__beecommitInjected) return;
    window.__beecommitInjected = true;

    // ─── DOM Selectors (confirmed from live Beecrowd v8.3.0) ──────────
    const SELECTORS = {
        // Runs page table
        acceptedLink: 'td.answer.a-1 a',     // "Accepted" verdict links (a-1 class is on the td)
        runIdCell: 'td.id a',                  // Submission ID in first column
        problemIdCell: 'td.tiny a',            // Problem ID column
        languageCell: 'td.semi-wide-15.center',// Language column

        // Code page
        aceEditor: '.ace_editor',              // Ace editor container
        aceLine: '.ace_line',                  // Individual code lines
    };

    // ─── Detect current page context ──────────────────────────────────
    const url = window.location.href;
    const isRunsPage = /\/runs\/?(\?|$)/.test(url);
    const isCodePage = /\/runs\/code\/\d+/.test(url);

    console.log('[BeeCommit] Content script loaded on:', url);

    if (isRunsPage) {
        initRunsPage();
    }

    if (isCodePage) {
        initCodePage();
    }

    // ═══════════════════════════════════════════════════════════════════
    // RUNS PAGE — Add sync buttons next to "Accepted" verdicts
    // ═══════════════════════════════════════════════════════════════════

    function initRunsPage() {
        console.log('[BeeCommit] 🐝 Scanning runs page...');

        const processedRuns = new Set();

        // Scan now and also observe for dynamic changes (pagination, AJAX)
        scanRunsTable(processedRuns);

        const observer = new MutationObserver(() => {
            scanRunsTable(processedRuns);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function scanRunsTable(processedRuns) {
        const acceptedLinks = document.querySelectorAll(SELECTORS.acceptedLink);

        for (const link of acceptedLinks) {
            // Get the run ID from the link href: /pt/runs/code/{RUN_ID}
            const hrefMatch = link.getAttribute('href')?.match(/\/runs\/code\/(\d+)/);
            if (!hrefMatch) continue;

            const runId = hrefMatch[1];
            if (processedRuns.has(runId)) continue;
            processedRuns.add(runId);

            // Extract metadata from the same table row
            const row = link.closest('tr');
            if (!row) continue;

            const problemIdEl = row.querySelector(SELECTORS.problemIdCell);
            const languageEl = row.querySelector(SELECTORS.languageCell);

            const problemId = problemIdEl?.textContent.trim();
            const language = languageEl?.textContent.trim();

            if (!problemId) continue;

            // Inject sync badge
            addSyncBadge(link, { runId, problemId, language });
        }
    }

    /**
     * Add a 🐝 sync badge next to an accepted verdict link.
     */
    function addSyncBadge(verdictLink, metadata) {
        const badge = document.createElement('span');
        badge.className = 'beecommit-badge';
        badge.textContent = ' 🐝';
        badge.title = `Sync problem ${metadata.problemId} to GitHub`;
        badge.style.cssText = `
      cursor: pointer;
      font-size: 14px;
      margin-left: 6px;
      transition: transform 0.2s;
      display: inline-block;
    `;

        badge.addEventListener('mouseenter', () => {
            badge.style.transform = 'scale(1.3)';
        });
        badge.addEventListener('mouseleave', () => {
            badge.style.transform = 'scale(1)';
        });

        badge.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            badge.textContent = ' ⏳';
            badge.style.cursor = 'wait';

            try {
                // Navigate to code page in background to extract code
                const code = await fetchCodeFromPage(metadata.runId);

                if (!code) {
                    badge.textContent = ' ❌';
                    badge.title = 'Could not extract code. Try opening the submission page directly.';
                    return;
                }

                const result = await sendToBackground({
                    problemId: metadata.problemId,
                    language: metadata.language,
                    code,
                });

                if (result?.success) {
                    badge.textContent = ' ✅';
                    badge.title = 'Synced to GitHub!';
                    badge.style.cursor = 'default';
                } else {
                    badge.textContent = ' ❌';
                    badge.title = `Failed: ${result?.error || 'Unknown error'}`;
                    badge.style.cursor = 'pointer';
                }
            } catch (err) {
                badge.textContent = ' ❌';
                badge.title = `Error: ${err.message}`;
                badge.style.cursor = 'pointer';
            }
        });

        verdictLink.parentElement?.appendChild(badge);
    }

    /**
     * Fetch code from a submission's code page by opening it in a hidden iframe.
     * We need the Ace editor to actually render, so we can't just parse HTML.
     */
    async function fetchCodeFromPage(runId) {
        return new Promise((resolve) => {
            const langPrefix = window.location.pathname.split('/')[1] || 'pt';
            const codeUrl = `${window.location.origin}/${langPrefix}/runs/code/${runId}`;

            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:800px; height:600px; opacity:0; pointer-events:none;';
            iframe.src = codeUrl;

            const timeout = setTimeout(() => {
                cleanup();
                resolve(null);
            }, 15000);

            function cleanup() {
                clearTimeout(timeout);
                iframe.remove();
            }

            iframe.addEventListener('load', () => {
                // Give Ace editor time to initialize
                setTimeout(() => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        const iframeWin = iframe.contentWindow;

                        let code = null;

                        // Method 1: Use Ace editor API
                        const aceEditorEl = iframeDoc.querySelector(SELECTORS.aceEditor);
                        if (aceEditorEl && iframeWin.ace) {
                            try {
                                code = iframeWin.ace.edit(aceEditorEl).getValue();
                            } catch (e) {
                                console.warn('[BeeCommit] Ace API failed:', e);
                            }
                        }

                        // Method 2: Scrape Ace lines from DOM
                        if (!code) {
                            const lines = iframeDoc.querySelectorAll(SELECTORS.aceLine);
                            if (lines.length > 0) {
                                code = Array.from(lines).map(l => l.textContent).join('\n');
                            }
                        }

                        // Method 3: fallback to <pre>
                        if (!code) {
                            const pre = iframeDoc.querySelector('pre');
                            if (pre) code = pre.textContent;
                        }

                        cleanup();
                        resolve(code);
                    } catch (err) {
                        console.error('[BeeCommit] Error extracting code from iframe:', err);
                        cleanup();
                        resolve(null);
                    }
                }, 2000);
            });

            document.body.appendChild(iframe);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // CODE PAGE — Floating sync button for accepted submissions
    // ═══════════════════════════════════════════════════════════════════

    function initCodePage() {
        console.log('[BeeCommit] 🐝 On code view page, checking verdict...');

        // Wait for Ace editor to initialize
        setTimeout(() => {
            const data = extractCodePageData();

            if (!data) {
                console.log('[BeeCommit] Could not extract data from code page.');
                return;
            }

            if (!data.isAccepted) {
                console.log('[BeeCommit] Submission is not Accepted, skipping.');
                return;
            }

            console.log('[BeeCommit] ✅ Accepted submission:', data);
            addFloatingSyncButton(data);
        }, 2000);
    }

    function extractCodePageData() {
        // The code page uses <dl><dt>Label</dt><dd>Value</dd></dl> for metadata
        let problemId = null;
        let rawLanguage = null;
        let isAccepted = false;

        const dts = document.querySelectorAll('dt');
        for (const dt of dts) {
            const label = dt.textContent.trim().toLowerCase();
            const dd = dt.nextElementSibling;
            if (!dd || dd.tagName !== 'DD') continue;

            const value = dd.textContent.trim();

            // Problem: look for link or text with problem ID
            if (label.includes('problem') || label.includes('problema')) {
                const link = dd.querySelector('a');
                const text = link?.textContent.trim() || value;
                const match = text.match(/(\d+)/);
                if (match) problemId = match[1];
            }

            // Answer/verdict: check for "answer a-1" span or text
            if (label.includes('answer') || label.includes('resposta')) {
                const span = dd.querySelector('span.answer');
                const answerText = (span?.textContent || value).trim().toLowerCase();
                isAccepted = answerText.includes('accepted') || answerText.includes('aceito');
            }

            // Language
            if (label.includes('language') || label.includes('linguagem')) {
                rawLanguage = value;
            }
        }

        // Extract code from Ace editor
        let code = null;
        const aceEditorEl = document.querySelector(SELECTORS.aceEditor);
        if (aceEditorEl && typeof ace !== 'undefined') {
            try {
                code = ace.edit(aceEditorEl).getValue();
            } catch (e) {
                console.warn('[BeeCommit] Ace API failed:', e);
            }
        }

        // Fallback: scrape lines
        if (!code) {
            const lines = document.querySelectorAll(SELECTORS.aceLine);
            if (lines.length > 0) {
                code = Array.from(lines).map(l => l.textContent).join('\n');
            }
        }

        console.log('[BeeCommit] Extracted:', { problemId, rawLanguage, isAccepted, hasCode: !!code });

        if (!problemId || !code) return null;

        return { problemId, language: rawLanguage, code, isAccepted };
    }

    function addFloatingSyncButton(data) {
        const btn = document.createElement('button');
        btn.id = 'beecommit-sync-btn';
        btn.innerHTML = '🐝 Sync to GitHub';
        btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      padding: 14px 24px;
      background: linear-gradient(135deg, #f5a623, #f7c948);
      color: #1a1a2e;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(245, 166, 35, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: system-ui, sans-serif;
    `;

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 6px 20px rgba(245, 166, 35, 0.6)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 16px rgba(245, 166, 35, 0.4)';
        });

        btn.addEventListener('click', async () => {
            btn.innerHTML = '⏳ Syncing...';
            btn.disabled = true;
            btn.style.cursor = 'wait';

            const result = await sendToBackground({
                problemId: data.problemId,
                language: data.language,
                code: data.code,
            });

            if (result?.success) {
                btn.innerHTML = '✅ Synced!';
                btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
                btn.style.color = '#fff';
            } else {
                btn.innerHTML = `❌ ${result?.error || 'Failed'}`;
                btn.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                btn.style.color = '#fff';
                btn.disabled = false;
                btn.style.cursor = 'pointer';
            }
        });

        document.body.appendChild(btn);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SHARED — Communication with Background Worker
    // ═══════════════════════════════════════════════════════════════════

    function sendToBackground({ problemId, language, code }) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                {
                    type: 'SUBMISSION_ACCEPTED',
                    problemId,
                    language,
                    code,
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('[BeeCommit]', chrome.runtime.lastError);
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }
})();
