import { useState } from 'react'
import { Database, ExternalLink, ChevronRight } from 'lucide-react'
import { saveConfig } from '@/lib/supabase'

interface Props { onDone: () => void }

export function SetupScreen({ onDone }: Props) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    const cleanUrl = url.trim().replace(/\/$/, '')
    const cleanKey = anonKey.trim()
    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
      setError('URL should look like https://xxxxxxxxxxxx.supabase.co')
      return
    }
    if (cleanKey.length < 20) {
      setError('Anon key looks too short — copy it from the API settings page')
      return
    }
    saveConfig(cleanUrl, cleanKey)
    onDone()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Database size={28} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect your database</h1>
          <p className="text-slate-400 text-sm">
            This dashboard uses Supabase — a free cloud database so your data syncs across all your devices.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">One-time setup (2 minutes)</h2>
          <ol className="space-y-3 text-sm text-slate-400">
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <span>
                Go to{' '}
                <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">
                  supabase.com <ExternalLink size={11} />
                </a>
                {' '}→ Sign up free → Create a new project
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <span>
                In your project, go to <strong className="text-slate-300">SQL Editor</strong> and run the setup script from{' '}
                <code className="text-slate-300 bg-slate-900 px-1 rounded">supabase_setup.sql</code> in the repo root
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <span>
                Go to <strong className="text-slate-300">Project Settings → API</strong> and copy the <em>Project URL</em> and <em>anon public</em> key below
              </span>
            </li>
          </ol>
        </div>

        {/* Inputs */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError('') }}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Anon public key</label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => { setAnonKey(e.target.value); setError('') }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 placeholder-slate-600"
            />
            <p className="text-xs text-slate-600 mt-1">Saved in your browser only — safe to use publicly.</p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={!url || !anonKey}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Connect <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
