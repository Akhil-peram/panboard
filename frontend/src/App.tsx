import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import SummaryDashboard from './components/SummaryDashboard'
import type { UploadResponse } from './services/api'
import { 
  BarChart3, 
  RefreshCw, 
  Layers, 
  Sun, 
  Moon, 
  Palette, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  FileSpreadsheet, 
  ExternalLink, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  Lock
} from 'lucide-react'

const GithubIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

function App() {
  const [data, setData] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeFooterModal, setActiveFooterModal] = useState<'privacy' | 'terms' | 'support' | null>(null)
  
  // Theme state: light, dark, tokyo-night
  const [theme, setTheme] = useState<'light' | 'dark' | 'tokyo-night'>(() => {
    const saved = localStorage.getItem('theme') as any
    return saved || 'light'
  })

  useEffect(() => {
    document.body.className = `theme-${theme}`
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleUploadSuccess = (result: UploadResponse) => {
    setData(result)
    setError(null)
  }

  const handleUploadError = (errMsg: string) => {
    setError(errMsg)
    setData(null)
  }

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'tokyo-night'
      return 'light'
    })
  }

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col transition-colors duration-300 selection:bg-indigo-500/20 selection:text-indigo-400">
      {/* Sticky Professional Top Navbar */}
      <header className="sticky top-0 z-40 bg-theme-bg/80 backdrop-blur-md border-b border-theme-border transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div 
            onClick={() => setData(null)} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-theme-text">
                Pan<span className="text-indigo-500">board</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                DaaS v2.0
              </span>
            </div>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center space-x-3">
            {/* GitHub Repo Button */}
            <a
              href="https://github.com/Akhil-peram/panboard"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-theme-sub hover:text-theme-text bg-theme-card hover:bg-theme-border rounded-xl transition-all border border-theme-border"
              title="View on GitHub"
            >
              <GithubIcon className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-theme-sub hover:text-theme-text bg-theme-card hover:bg-theme-border rounded-xl transition-all border border-theme-border cursor-pointer"
              title={`Theme: ${theme.toUpperCase()}`}
            >
              {theme === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
              {theme === 'dark' && <Moon className="h-4 w-4 text-indigo-400" />}
              {theme === 'tokyo-night' && <Palette className="h-4 w-4 text-cyan-400" />}
            </button>

            {/* Reset / Upload New Dataset Button */}
            {data && (
              <button 
                onClick={() => setData(null)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                <span>New Upload</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {!data ? (
          /* Hero Section when no dataset uploaded */
          <div className="space-y-16 animate-in fade-in duration-700">
            <div className="text-center space-y-6 max-w-3xl mx-auto pt-6">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next-Gen Instant Data Profiling & Analytics</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-6xl font-black text-theme-text tracking-tight leading-tight">
                Turn Raw Datasets into <br />
                <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  Interactive Dashboards
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-theme-sub font-medium leading-relaxed max-w-2xl mx-auto">
                Upload CSV, Excel, or ODS spreadsheets. Panboard profiles statistical distributions, performs real-time data transformations, detects outliers, and builds presentation-ready visualizations instantly.
              </p>

              {/* Supported File Formats Pill Bar */}
              <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
                <span className="text-xs text-theme-sub font-bold uppercase tracking-wider mr-2">Supported:</span>
                {['CSV', '.XLSX', '.XLS', '.ODS', '.XLSB', '.XLSM'].map(fmt => (
                  <span key={fmt} className="px-2.5 py-1 text-[11px] font-bold bg-theme-card border border-theme-border rounded-lg text-theme-sub">
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Upload Area Component Container */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-theme-card p-2 sm:p-4 rounded-3xl border border-theme-border shadow-2xl">
                <FileUpload 
                  onUploadSuccess={handleUploadSuccess} 
                  onUploadError={handleUploadError} 
                />
              </div>
            </div>

            {/* Feature Cards Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="bg-theme-card p-6 rounded-2xl border border-theme-border space-y-3 hover:border-indigo-500/40 transition-colors group">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-theme-text">Instant Data Profiling</h3>
                <p className="text-xs text-theme-sub leading-relaxed">
                  Automatic data type inference, null counts, central tendencies (mean, median, std dev), and correlation heatmaps computed in real-time.
                </p>
              </div>

              <div className="bg-theme-card p-6 rounded-2xl border border-theme-border space-y-3 hover:border-purple-500/40 transition-colors group">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-theme-text">Interactive Data Cleaning</h3>
                <p className="text-xs text-theme-sub leading-relaxed">
                  Impute missing values with mean, median, mode, or custom defaults. Perform column type casting, renaming, and row filtering on the fly.
                </p>
              </div>

              <div className="bg-theme-card p-6 rounded-2xl border border-theme-border space-y-3 hover:border-cyan-500/40 transition-colors group">
                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-theme-text">Export & Anomaly Detection</h3>
                <p className="text-xs text-theme-sub leading-relaxed">
                  Automated IQR statistical outlier detection, interactive Recharts visualizations, and 1-click dataset exports to CSV, Excel, or JSON.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Dashboard Workspace */
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Active File Toolbar Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-theme-card px-6 py-4 rounded-2xl shadow-sm border border-theme-border gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-theme-text truncate max-w-xs sm:max-w-md">{data.filename}</h2>
                  <p className="text-[11px] font-semibold text-theme-sub">
                    Session ID: <span className="font-mono text-indigo-400">{data.dataset_id.slice(0, 8)}...</span> • {data.row_count} rows • {data.columns.length} columns
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setData(null)}
                className="group flex items-center px-4 py-2 text-xs font-bold text-theme-text hover:text-indigo-400 bg-theme-bg hover:bg-theme-border rounded-xl transition-all border border-theme-border cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2 transition-transform group-hover:rotate-180 duration-500" />
                Upload Different File
              </button>
            </div>
            
            <SummaryDashboard data={data} onDataUpdate={setData} />
          </div>
        )}

        {/* Error Alert Display */}
        {error && (
          <div className="max-w-2xl mx-auto bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl animate-in slide-in-from-top duration-500 flex items-start space-x-3">
            <div className="p-2 bg-rose-500/20 rounded-xl">
              <svg className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.293 7.293a1 1 0 011.414 0L10 8.586l.293-.293a1 1 0 111.414 1.414L11.414 10l.293.293a1 1 0 01-1.414 1.414L10 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Processing Error</h3>
              <p className="text-xs text-theme-sub mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </main>

      {/* SaaS Grade Footer */}
      <footer className="mt-auto border-t border-theme-border bg-theme-card/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand Info */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-black text-theme-text tracking-tight">Panboard</span>
              </div>
              <p className="text-xs text-theme-sub leading-relaxed">
                High-performance Dashboard-as-a-Service for instant data profiling, interactive cleaning, and visual analytics.
              </p>
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full w-fit border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>All Engine Systems Operational</span>
              </div>
            </div>

            {/* Column 2: Product Features */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider">Product Features</h4>
              <ul className="space-y-2 text-xs text-theme-sub font-medium">
                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-1.5 text-indigo-400" /> Multi-format Dataset Upload</li>
                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-1.5 text-indigo-400" /> Mean / Mode Imputation</li>
                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-1.5 text-indigo-400" /> Dynamic IQR Outlier Checks</li>
                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-1.5 text-indigo-400" /> CSV, XLSX & JSON Exports</li>
              </ul>
            </div>

            {/* Column 3: Tech Stack */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider">Tech Architecture</h4>
              <ul className="space-y-2 text-xs text-theme-sub font-medium">
                <li>FastAPI & Pandas Data Engine</li>
                <li>React 19 + TypeScript + Vite</li>
                <li>Recharts Visualization Suite</li>
                <li>Cloudflare Pages CDN Deployment</li>
              </ul>
            </div>

            {/* Column 4: Support & Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider">Support & Legal</h4>
              <div className="flex flex-col space-y-2 text-xs text-theme-sub font-medium">
                <button onClick={() => setActiveFooterModal('privacy')} className="text-left hover:text-indigo-400 transition-colors flex items-center cursor-pointer">
                  <Lock className="h-3 w-3 mr-1.5" /> Privacy Policy
                </button>
                <button onClick={() => setActiveFooterModal('terms')} className="text-left hover:text-indigo-400 transition-colors flex items-center cursor-pointer">
                  <FileText className="h-3 w-3 mr-1.5" /> Terms of Service
                </button>
                <button onClick={() => setActiveFooterModal('support')} className="text-left hover:text-indigo-400 transition-colors flex items-center cursor-pointer">
                  <HelpCircle className="h-3 w-3 mr-1.5" /> Contact Support
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-theme-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-theme-sub">
            <p>© {new Date().getFullYear()} Panboard. Released under MIT License.</p>
            <div className="flex items-center space-x-4">
              <a href="https://panboard.pages.dev" className="hover:text-theme-text transition-colors">panboard.pages.dev</a>
              <span>•</span>
              <a href="https://github.com/Akhil-peram/panboard" target="_blank" rel="noreferrer" className="hover:text-theme-text transition-colors flex items-center">
                GitHub Repo <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Footer Modals */}
      {activeFooterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-theme-card rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-theme-border animate-in zoom-in-95 duration-300 space-y-6 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-theme-border">
              <h3 className="text-lg font-bold text-theme-text capitalize">
                {activeFooterModal === 'support' ? 'Contact Support' : `${activeFooterModal} Policy`}
              </h3>
              <button 
                onClick={() => setActiveFooterModal(null)}
                className="text-theme-sub hover:text-theme-text text-sm font-semibold p-1 hover:bg-theme-border rounded-lg transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-xs text-theme-sub space-y-3 pr-2 custom-scrollbar">
              {activeFooterModal === 'privacy' && (
                <>
                  <p className="font-bold text-theme-text">Last Updated: July 2026</p>
                  <p>At Panboard, we prioritize your data privacy. Because our service processes your spreadsheets locally or on ephemeral server instances, we do not store your uploaded datasets permanently.</p>
                  <p className="font-semibold text-theme-text">1. Data Security & Eviction</p>
                  <p>We do not sell or collect your uploaded data. Ephemeral dataset files cached on our server are automatically evicted after 30 minutes of inactivity.</p>
                  <p className="font-semibold text-theme-text">2. Local Storage</p>
                  <p>We only store non-sensitive user preferences (such as your chosen active UI theme) in your browser's local storage.</p>
                </>
              )}

              {activeFooterModal === 'terms' && (
                <>
                  <p className="font-bold text-theme-text">Last Updated: July 2026</p>
                  <p>Welcome to Panboard. By using our application, you agree to these simplified terms of service.</p>
                  <p className="font-semibold text-theme-text">1. Acceptable Usage</p>
                  <p>Panboard is provided as an open tool for data analysis and visualization. You remain the sole owner of all datasets and charts generated on the platform.</p>
                  <p className="font-semibold text-theme-text">2. Limitation of Liability</p>
                  <p>The platform is provided "as is" without warranty of any kind. We are not liable for analytical errors resulting from corrupted input spreadsheets.</p>
                </>
              )}

              {activeFooterModal === 'support' && (
                <form onSubmit={(e) => { e.preventDefault(); alert('Support message sent successfully!'); setActiveFooterModal(null); }} className="space-y-4">
                  <p>Need assistance or have feature requests? Send us a message and we'll reply promptly.</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-sub uppercase tracking-wider">Your Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="you@example.com" 
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3.5 py-2 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-sub uppercase tracking-wider">Message</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Describe your issue or feedback..." 
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3.5 py-2 text-xs text-theme-text focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {activeFooterModal !== 'support' && (
              <div className="pt-3 border-t border-theme-border flex justify-end">
                <button 
                  onClick={() => setActiveFooterModal(null)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
