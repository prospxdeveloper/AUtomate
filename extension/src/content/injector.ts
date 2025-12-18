/**
 * injector.ts
 *
 * Web-accessible helper for safe script injection into the page context.
 * This is a placeholder implementation; content scripts can import it
 * and inject when needed for sites that require page-context access.
 */

export function injectScript(srcUrl: string): void {
  const script = document.createElement('script');
  script.src = srcUrl;
  script.type = 'module';
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}
