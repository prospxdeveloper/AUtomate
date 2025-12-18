/**
 * Content Script - Injected into web pages for context extraction
 */

import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';

console.log('AUTOME content script loaded');

const AUTOME_WIDGET_ID = 'autome-suggestion-widget';
const AUTOME_PALETTE_ID = 'autome-command-palette';

let suggestionPollTimer: number | null = null;
let lastWidgetText: string | null = null;
let lastWidgetShownAt = 0;
const dismissedSuggestionTexts = new Map<string, number>();

// Listen for highlight events
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

startSuggestionPolling();

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_COMMAND_PALETTE') {
    void openCommandPalette();
    sendResponse({ success: true });
  }
  
  if (message.type === 'EXTRACT_PAGE_CONTEXT') {
    const context = extractPageContext();
    sendResponse({ success: true, data: context });
  }

  if (message.type === 'BROWSER_ACTIONS') {
    executeBrowserActions(message.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((e: any) => sendResponse({ success: false, error: e?.message || 'Browser action failed' }));
    return true;
  }

  return true;
});

function isElementActionable(el: Element): boolean {
  const anyEl = el as any;
  if (anyEl?.disabled) return false;

  const rect = (el as HTMLElement).getBoundingClientRect?.();
  if (!rect) return true;
  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = window.getComputedStyle(el as Element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

  return true;
}

function dispatchInputEvents(el: Element): void {
  try {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    // ignore
  }
}

async function executeBrowserActions(payload: any): Promise<any> {
  const actions = Array.isArray(payload?.actions) ? payload.actions : [];
  if (actions.length === 0) {
    throw new Error('No actions provided');
  }

  const results: Array<{ index: number; type: string; ok: boolean; error?: string }> = [];

  for (let i = 0; i < Math.min(actions.length, 20); i++) {
    const action = actions[i];
    const type = String(action?.type || '').toLowerCase();
    const selector = String(action?.selector || '');
    const text = typeof action?.text === 'string' ? action.text : '';

    if (!selector || selector.length > 500) {
      results.push({ index: i, type, ok: false, error: 'Invalid selector' });
      continue;
    }
    if (!['click', 'type', 'fill'].includes(type)) {
      results.push({ index: i, type, ok: false, error: 'Unsupported action type' });
      continue;
    }

    const el = document.querySelector(selector);
    if (!el) {
      results.push({ index: i, type, ok: false, error: 'Element not found' });
      continue;
    }
    if (!isElementActionable(el)) {
      results.push({ index: i, type, ok: false, error: 'Element not actionable' });
      continue;
    }

    try {
      if (type === 'click') {
        (el as HTMLElement).scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
        (el as HTMLElement).click();
      } else {
        const isInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
        const isEditable = (el as HTMLElement).isContentEditable === true;
        if (!isInput && !isEditable) {
          throw new Error('Target is not an input/textarea/contenteditable');
        }

        (el as HTMLElement).scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
        (el as HTMLElement).focus?.();

        if (isInput) {
          if (type === 'fill') {
            (el as HTMLInputElement | HTMLTextAreaElement).value = text;
          } else {
            const current = (el as HTMLInputElement | HTMLTextAreaElement).value || '';
            (el as HTMLInputElement | HTMLTextAreaElement).value = current + text;
          }
          dispatchInputEvents(el);
        } else if (isEditable) {
          const htmlEl = el as HTMLElement;
          if (type === 'fill') {
            htmlEl.textContent = text;
          } else {
            htmlEl.textContent = (htmlEl.textContent || '') + text;
          }
          dispatchInputEvents(el);
        }
      }

      results.push({ index: i, type, ok: true });
    } catch (e: any) {
      results.push({ index: i, type, ok: false, error: e?.message || 'Action failed' });
    }
  }

  return { results };
}

function startSuggestionPolling(): void {
  if (suggestionPollTimer) return;

  // Every 2 seconds: extract page context -> get suggestions -> show widget.
  suggestionPollTimer = window.setInterval(async () => {
    try {
      if (document.visibilityState !== 'visible') return;

      // Don't pop suggestions while command palette is open.
      if (document.getElementById(AUTOME_PALETTE_ID)) return;

      // Avoid showing in extension/internal pages.
      if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') return;

      const context = extractPageContext();
      const res = await chrome.runtime.sendMessage({
        type: 'GET_SUGGESTIONS',
        payload: { context },
      });

      if (!res?.success) return;
      const suggestions = (res?.data || []) as Array<{ id: string; text: string }>; // minimal shape
      if (!Array.isArray(suggestions) || suggestions.length === 0) return;

      const primary = suggestions[0];
      if (!primary?.id || !primary?.text) return;

      const now = Date.now();

      const dismissedAt = dismissedSuggestionTexts.get(primary.text);
      if (dismissedAt && now - dismissedAt < 60_000) return;

      // Reduce flicker/repeats.
      if (lastWidgetText === primary.text && now - lastWidgetShownAt < 10_000) return;

      showSuggestionWidget({
        suggestionId: primary.id,
        text: primary.text,
        secondaryText: suggestions[1]?.text,
      });

      lastWidgetText = primary.text;
      lastWidgetShownAt = now;
    } catch {
      // Best-effort; polling should never crash the page.
    }
  }, 2000);
}

function showSuggestionWidget(options: { suggestionId: string; text: string; secondaryText?: string }): void {
  const existing = document.getElementById(AUTOME_WIDGET_ID);
  if (existing) existing.remove();

  const widget = document.createElement('div');
  widget.id = AUTOME_WIDGET_ID;
  widget.style.cssText = `
    position: fixed;
    bottom: 18px;
    right: 18px;
    width: 340px;
    max-width: calc(100vw - 36px);
    background: rgba(17, 24, 39, 0.92);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 14px;
    box-shadow: 0 16px 50px rgba(0,0,0,0.35);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
    backdrop-filter: blur(10px);
    animation: slideUp 0.2s ease-out;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: linear-gradient(135deg, rgba(14,165,233,0.20) 0%, rgba(2,132,199,0.16) 100%);
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight: 650; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.95;';
  title.textContent = 'AUTOME SUGGESTION';

  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss suggestion');
  close.style.cssText = `
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.85);
    cursor: pointer;
    font-size: 18px;
    line-height: 18px;
    padding: 4px 6px;
  `;
  close.textContent = '×';

  header.appendChild(title);
  header.appendChild(close);

  const body = document.createElement('div');
  body.style.cssText = 'padding: 12px 14px 14px 14px;';

  const text = document.createElement('div');
  text.style.cssText = 'font-size: 14px; line-height: 1.35; margin-bottom: 10px;';
  text.textContent = options.text;

  const secondary = document.createElement('div');
  secondary.style.cssText = 'font-size: 12px; line-height: 1.35; opacity: 0.8; margin-top: -6px; margin-bottom: 10px;';
  if (options.secondaryText) secondary.textContent = options.secondaryText;

  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; gap: 10px;';

  const executeBtn = document.createElement('button');
  executeBtn.type = 'button';
  executeBtn.style.cssText = `
    flex: 1;
    border: none;
    cursor: pointer;
    padding: 10px 12px;
    border-radius: 10px;
    font-weight: 600;
    background: rgba(14,165,233,0.95);
    color: white;
  `;
  executeBtn.textContent = 'Execute';

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.style.cssText = `
    flex: 1;
    border: 1px solid rgba(255,255,255,0.16);
    cursor: pointer;
    padding: 10px 12px;
    border-radius: 10px;
    font-weight: 600;
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.92);
  `;
  dismissBtn.textContent = 'Dismiss';

  actions.appendChild(executeBtn);
  actions.appendChild(dismissBtn);

  body.appendChild(text);
  if (options.secondaryText) body.appendChild(secondary);
  body.appendChild(actions);

  widget.appendChild(header);
  widget.appendChild(body);

  const dismissAndRemove = async (reason: 'manual' | 'auto' = 'manual') => {
    dismissedSuggestionTexts.set(options.text, Date.now());
    try {
      await chrome.runtime.sendMessage({
        type: 'DISMISS_SUGGESTION',
        payload: { suggestionId: options.suggestionId },
      });
    } catch {
      // ignore
    }
    widget.remove();
    if (reason === 'manual') {
      showNotification('Suggestion dismissed');
    }
  };

  close.addEventListener('click', () => {
    void dismissAndRemove('manual');
  });
  dismissBtn.addEventListener('click', () => {
    void dismissAndRemove('manual');
  });

  executeBtn.addEventListener('click', async () => {
    executeBtn.disabled = true;
    executeBtn.style.opacity = '0.75';
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'EXECUTE_SUGGESTION',
        payload: { suggestionId: options.suggestionId },
      });
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to execute suggestion');
      }
      widget.remove();
      showNotification('Executed');
    } catch (e: any) {
      executeBtn.disabled = false;
      executeBtn.style.opacity = '1';
      showNotification(e?.message || 'Failed to execute', 'error');
    }
  });

  document.body.appendChild(widget);

  // Auto-dismiss after 10 seconds.
  window.setTimeout(() => {
    if (document.getElementById(AUTOME_WIDGET_ID)) {
      void dismissAndRemove('auto');
    }
  }, 10_000);
}

function handleTextSelection(_event: Event): void {
  const selection = window.getSelection();
  
  if (!selection || selection.toString().trim().length === 0) {
    return;
  }

  const selectedText = selection.toString().trim();
  
  // Only process substantial selections
  if (selectedText.length < 10) {
    return;
  }

  // Show subtle indicator
  showHighlightIndicator(selectedText);
}

function showHighlightIndicator(text: string): void {
  // Remove existing indicator
  const existing = document.getElementById('autome-highlight-indicator');
  if (existing) {
    existing.remove();
  }

  // Create indicator
  const indicator = document.createElement('div');
  indicator.id = 'autome-highlight-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    cursor: pointer;
    animation: slideUp 0.3s ease-out;
  `;
  
  indicator.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      <span>Save highlight</span>
    </div>
  `;

  indicator.addEventListener('click', () => {
    saveHighlight(text);
    indicator.remove();
  });

  document.body.appendChild(indicator);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.remove();
    }
  }, 5000);
}

function saveHighlight(text: string): void {
  chrome.runtime.sendMessage({
    type: 'CAPTURE_HIGHLIGHT',
    payload: {
      text,
      url: window.location.href,
      title: document.title,
    },
  }, (response) => {
    if (response?.success) {
      showNotification('Highlight saved!');
    } else {
      showNotification('Failed to save highlight', 'error');
    }
  });
}

function extractPageContext(): any {
  // Extract key content from the page
  const title = document.title;
  const url = window.location.href;
  
  // Try to get main content
  let content = '';
  
  // Try article tag first
  const article = document.querySelector('article');
  if (article) {
    content = article.innerText.slice(0, 1000);
  } else {
    // Fallback to body
    const body = document.body.innerText;
    content = body.slice(0, 1000);
  }

  return {
    url,
    title,
    content,
    metadata: {
      hostname: window.location.hostname,
      pathname: window.location.pathname,
    },
    timestamp: new Date().toISOString(),
  };
}

async function openCommandPalette(): Promise<void> {
  // Check if already open
  if (document.getElementById(AUTOME_PALETTE_ID)) {
    return;
  }

  type PaletteItemKind = 'command' | 'usecase' | 'suggestion' | 'memory';
  type PaletteItem = {
    id: string;
    kind: PaletteItemKind;
    title: string;
    subtitle?: string;
    // Used for Fuse search.
    searchText: string;
    run: () => Promise<void> | void;
  };

  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.id = AUTOME_PALETTE_ID;
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    z-index: 999999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    animation: fadeIn 0.2s ease-out;
  `;

  // Create command palette
  const palette = document.createElement('div');
  palette.style.cssText = `
    background: white;
    width: 600px;
    max-width: 90vw;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    overflow: hidden;
    animation: slideDown 0.2s ease-out;
  `;

  palette.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
      <input 
        id="autome-search" 
        type="text" 
        placeholder="Search actions, memories..." 
        style="
          width: 100%;
          border: none;
          outline: none;
          font-size: 16px;
          font-family: system-ui;
        "
      />
    </div>
    <div id="autome-results" style="max-height: 420px; overflow-y: auto; padding: 8px;"></div>
  `;

  backdrop.appendChild(palette);
  document.body.appendChild(backdrop);

  // Focus search input
  setTimeout(() => {
    const input = document.getElementById('autome-search') as HTMLInputElement;
    input?.focus();
  }, 100);

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      cleanupAndClose();
    }
  });

  const inputEl = document.getElementById('autome-search') as HTMLInputElement | null;
  const resultsEl = document.getElementById('autome-results') as HTMLDivElement | null;
  if (!inputEl || !resultsEl) {
    cleanupAndClose();
    return;
  }

  const input = inputEl;
  const results = resultsEl;

  let visibleItems: PaletteItem[] = [];
  let selectedIndex = 0;
  let searchDebounceTimer: number | null = null;

  const fallbackUseCases: Array<{ id: string; title: string; subtitle: string; searchText: string }> = [
    { id: 'youtube-summarization', title: 'Summarize YouTube video', subtitle: 'Create a concise summary + takeaways', searchText: 'youtube summarize video transcript key takeaways' },
    { id: 'email-personalization', title: 'Draft personalized email', subtitle: 'Generate a personalized outreach draft', searchText: 'email draft personalize outreach follow up' },
    { id: 'meeting-preparation', title: 'Prepare meeting brief', subtitle: 'Talking points and context for a meeting', searchText: 'meeting prep brief talking points' },
    { id: 'meeting-notes', title: 'Create meeting notes template', subtitle: 'Summary + action items template', searchText: 'meeting notes action items follow up' },
    { id: 'email-categorization', title: 'Categorize emails', subtitle: 'Urgent/medium/low buckets (heuristic)', searchText: 'email categorize label urgent medium low' },
    { id: 'data-cleaning', title: 'Clean messy data', subtitle: 'Standardize and dedupe text/table content', searchText: 'data cleaning dedupe normalize csv table' },
    { id: 'research-compilation', title: 'Compile research', subtitle: 'Create an outline from saved context', searchText: 'research compile outline citations tabs' },
    { id: 'resume-update', title: 'Update resume', subtitle: 'Rewrite bullets from recent accomplishments', searchText: 'resume update accomplishments rewrite bullets' },
    { id: 'cross-platform-sync', title: 'Cross-platform sync', subtitle: 'Run Composio tool slug (requires connection)', searchText: 'github jira linear slack sync issue create' },
  ];

  // Fetch server-defined use cases (best-effort). Falls back to local list.
  let useCases: Array<{ id: string; title: string; subtitle: string; searchText: string }> = fallbackUseCases;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_USE_CASES', payload: {} });
    const serverList = res?.data;
    if (res?.success && Array.isArray(serverList) && serverList.length > 0) {
      useCases = serverList.map((u: any) => ({
        id: String(u?.id || ''),
        title: String(u?.title || u?.id || ''),
        subtitle: String(u?.subtitle || ''),
        searchText: String(u?.searchText || `${u?.title || ''} ${u?.subtitle || ''} ${u?.id || ''}`),
      })).filter((u: any) => u.id && u.title);
      if (useCases.length === 0) useCases = fallbackUseCases;
    }
  } catch {
    // ignore
  }

  const baseItems: PaletteItem[] = [
    {
      id: 'command:categorizetabs',
      kind: 'command',
      title: 'Categorize tabs',
      subtitle: 'Group tabs by topic',
      searchText: 'categorize tabs group organize',
      run: async () => {
        await chrome.runtime.sendMessage({ type: 'CATEGORIZE_TABS', payload: {} });
        cleanupAndClose();
        showNotification('Categorizing tabs...');
      },
    },
    {
      id: 'command:savehighlight',
      kind: 'command',
      title: 'Save current selection as memory',
      subtitle: 'Select text on the page, then click the save bubble',
      searchText: 'save memory highlight selection',
      run: () => {
        cleanupAndClose();
        showNotification('Select text to save a highlight');
      },
    },
    ...useCases.map((uc) => ({
      id: `usecase:${uc.id}`,
      kind: 'usecase' as const,
      title: uc.title,
      subtitle: uc.subtitle,
      searchText: uc.searchText,
      run: async () => {
        await chrome.runtime.sendMessage({
          type: 'EXECUTE_USE_CASE',
          payload: {
            useCaseId: uc.id,
            parameters: {},
          },
        });
        cleanupAndClose();
        showNotification('Running use case...');
      },
    })),
  ];

  const fuseOptions: IFuseOptions<PaletteItem> = {
    keys: ['title', 'subtitle', 'searchText'],
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  };

  function render(items: PaletteItem[], query: string): void {
    visibleItems = items;
    if (selectedIndex < 0) selectedIndex = 0;
    if (selectedIndex >= visibleItems.length) selectedIndex = Math.max(0, visibleItems.length - 1);

    results.innerHTML = '';

    if (visibleItems.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 36px; text-align: center; color: #9ca3af;';
      empty.textContent = query ? 'No results found' : 'Type to search...';
      results.appendChild(empty);
      return;
    }

    for (let i = 0; i < visibleItems.length; i++) {
      const item = visibleItems[i];
      const row = document.createElement('div');
      row.setAttribute('role', 'option');
      row.style.cssText = `
        padding: 10px 12px;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 2px;
        ${i === selectedIndex ? 'background: #f3f4f6;' : ''}
      `;

      const top = document.createElement('div');
      top.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px;';
      const title = document.createElement('div');
      title.style.cssText = 'font-size: 14px; font-weight: 600; color: #111827;';
      title.textContent = item.title;
      const badge = document.createElement('div');
      badge.style.cssText = `
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        background: #eef2ff;
        color: #3730a3;
      `;
      badge.textContent = item.kind.toUpperCase();
      top.appendChild(title);
      top.appendChild(badge);

      row.appendChild(top);

      if (item.subtitle) {
        const sub = document.createElement('div');
        sub.style.cssText = 'font-size: 12px; color: #6b7280;';
        sub.textContent = item.subtitle;
        row.appendChild(sub);
      }

      row.addEventListener('mouseenter', () => {
        selectedIndex = i;
        render(visibleItems, query);
      });

      row.addEventListener('click', () => {
        void item.run();
      });

      results.appendChild(row);
    }

    // Ensure selected row is visible.
    const selected = results.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }

  async function buildItems(query: string): Promise<PaletteItem[]> {
    const items: PaletteItem[] = [...baseItems];

    // Suggestions: context-aware.
    try {
      const context = extractPageContext();
      const res = await chrome.runtime.sendMessage({
        type: 'GET_SUGGESTIONS',
        payload: { context },
      });
      if (res?.success && Array.isArray(res?.data)) {
        const suggestions = res.data as Array<{ id: string; text: string }>;
        suggestions.slice(0, 5).forEach((s) => {
          if (!s?.id || !s?.text) return;
          items.push({
            id: `suggestion:${s.id}`,
            kind: 'suggestion',
            title: s.text,
            subtitle: 'Proactive suggestion',
            searchText: s.text,
            run: async () => {
              await chrome.runtime.sendMessage({
                type: 'EXECUTE_SUGGESTION',
                payload: { suggestionId: s.id },
              });
              cleanupAndClose();
              showNotification('Executed');
            },
          });
        });
      }
    } catch {
      // ignore
    }

    // Memories: query-driven. (We only fetch when there's an actual query.)
    if (query.trim().length >= 2) {
      try {
        const res = await chrome.runtime.sendMessage({
          type: 'SEARCH_MEMORIES',
          payload: { query, limit: 10 },
        });
        if (res?.success && Array.isArray(res?.data)) {
          const memories = res.data as Array<{ id: string; content: string; source: string }>; // minimal
          memories.forEach((m) => {
            if (!m?.id || !m?.content) return;
            items.push({
              id: `memory:${m.id}`,
              kind: 'memory',
              title: m.content.slice(0, 120) + (m.content.length > 120 ? '…' : ''),
              subtitle: m.source ? `From: ${m.source}` : 'Saved memory',
              searchText: `${m.content} ${m.source || ''}`,
              run: () => {
                cleanupAndClose();
                if (m.source) {
                  window.open(m.source, '_blank', 'noopener,noreferrer');
                }
              },
            });
          });
        }
      } catch {
        // ignore
      }
    }

    return items;
  }

  async function refresh(query: string): Promise<void> {
    const items = await buildItems(query);

    if (!query.trim()) {
      // Default view: show a compact list of key items.
      selectedIndex = 0;
      render(items.slice(0, 12), query);
      return;
    }

    const fuse = new Fuse(items, fuseOptions);
    const results = fuse.search(query).slice(0, 12).map((r) => r.item);
    selectedIndex = 0;
    render(results, query);
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanupAndClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleItems.length === 0) return;
      selectedIndex = Math.min(visibleItems.length - 1, selectedIndex + 1);
      render(visibleItems, inputEl.value);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleItems.length === 0) return;
      selectedIndex = Math.max(0, selectedIndex - 1);
      render(visibleItems, inputEl.value);
      return;
    }

    if (e.key === 'Enter') {
      if (visibleItems.length === 0) return;
      e.preventDefault();
      void visibleItems[selectedIndex]?.run();
    }
  };

  const onInput = () => {
    if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = window.setTimeout(() => {
      void refresh(input.value);
    }, 150);
  };

  document.addEventListener('keydown', onKeyDown);
  input.addEventListener('input', onInput);

  function cleanupAndClose(): void {
    if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer);
    document.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('input', onInput);
    backdrop.remove();
  }

  // Initial render
  void refresh('');
}

function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: system-ui;
    font-size: 14px;
    animation: slideDown 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes slideDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
