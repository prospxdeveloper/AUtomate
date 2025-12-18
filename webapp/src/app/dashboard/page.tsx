import { siteConfig } from '@/lib/site';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-brand-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center justify-between gap-4 mb-10">
            <a href="/" className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-600" />
              <span className="font-semibold text-gray-900 dark:text-white">{siteConfig.name}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Dashboard</span>
            </a>
            <a className="btn btn-secondary" href="/">Back to home</a>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              A lightweight overview of AUTOME’s backend + extension capabilities.
            </p>
          </header>

          <section className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="card">
              <div className="text-sm text-gray-600 dark:text-gray-300">Extension endpoints</div>
              <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">Ready</div>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Use cases + execution API for the extension.
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600 dark:text-gray-300">LLM execution</div>
              <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">OpenRouter</div>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Remote use cases are executed server-side.
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600 dark:text-gray-300">Integrations</div>
              <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">Composio</div>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Cross-platform sync runs Composio tools.
              </div>
            </div>
          </section>

          <section className="card mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Quick links</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <a className="btn btn-secondary" href="/api/extension/use-cases">Use case catalog</a>
              <a className="btn btn-secondary" href="/api/extension/get-suggestions">Suggestions endpoint</a>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Tip: the Chrome extension consumes these endpoints via the background worker.
            </div>
          </section>

          <section className="card">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">What’s next</h2>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>Run the webapp locally and load the extension unpacked.</li>
              <li>Open any page, then use the extension sidepanel Tasks/Chat.</li>
              <li>Try a remote use case and optionally include a screenshot.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
