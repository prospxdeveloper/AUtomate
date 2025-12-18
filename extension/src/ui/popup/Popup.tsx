export default function Popup() {
  const openSidepanel = () => {
    chrome.sidePanel?.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  };

  const categorizeNow = async () => {
    await chrome.runtime.sendMessage({
      type: 'CATEGORIZE_TABS',
      payload: {},
    });
    window.close();
  };

  return (
    <div className="w-80 bg-white dark:bg-dark-bg">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-brand-600 to-brand-800 text-white animate-fade-in">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <svg className="w-5 h-5 animate-pulse-slow" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9z"/>
          </svg>
          AUTOME
        </h1>
        <p className="text-sm text-brand-100 mt-1">AI Browser Assistant</p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={openSidepanel}
          className="w-full btn btn-primary text-left flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Open Sidepanel
        </button>

        <button
          onClick={categorizeNow}
          className="w-full btn btn-secondary text-left flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Categorize Tabs
        </button>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-border">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-dark-muted mb-2">
          KEYBOARD SHORTCUTS
        </h3>
        <div className="space-y-2 text-sm text-gray-700 dark:text-dark-text">
          <div className="flex justify-between">
            <span>Command Palette</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-surface rounded text-xs">
              Alt+J
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Categorize Tabs</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-surface rounded text-xs">
              Alt+Shift+C
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
