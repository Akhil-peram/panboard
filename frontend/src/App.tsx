import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import SummaryDashboard from './components/SummaryDashboard'
import type { UploadResponse } from './services/api'
import { BarChart3, RefreshCw, Layers, Sun, Moon, Palette } from 'lucide-react'

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
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto w-full space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-[2rem] mb-2 shadow-2xl shadow-indigo-200 animate-in zoom-in duration-700">
            <BarChart3 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-black text-theme-text tracking-tight sm:text-6xl">
            Pan<span className="text-indigo-600">board</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-theme-sub font-medium">
            Turn your spreadsheets into interactive dashboards instantly. 
            Upload, visualize, and discover trends in seconds.
          </p>
        </header>

        {!data ? (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <FileUpload 
              onUploadSuccess={handleUploadSuccess} 
              onUploadError={handleUploadError} 
            />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-theme-card px-8 py-5 rounded-[2rem] shadow-sm border border-theme-border gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-theme-accent-bg rounded-2xl">
                  <Layers className="h-6 w-6 text-theme-accent-text" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-theme-text truncate max-w-[200px] sm:max-w-sm">{data.filename}</h2>
                  <p className="text-xs font-bold text-theme-accent-text uppercase tracking-widest">Active Workspace</p>
                </div>
              </div>
              <button 
                onClick={() => setData(null)}
                className="group flex items-center px-6 py-3 text-sm font-bold text-theme-text hover:text-theme-accent bg-theme-bg hover:bg-theme-border rounded-2xl transition-all duration-300 border border-theme-border"
              >
                <RefreshCw className="h-4 w-4 mr-2 transition-transform group-hover:rotate-180 duration-500" />
                Upload New Data
              </button>
            </div>
            
            <SummaryDashboard data={data} onDataUpdate={setData} />
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-5 rounded-2xl animate-in slide-in-from-top duration-500 flex items-start space-x-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.293 7.293a1 1 0 011.414 0L10 8.586l.293-.293a1 1 0 111.414 1.414L11.414 10l.293.293a1 1 0 01-1.414 1.414L10 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-500">Upload Failed</h3>
              <p className="text-sm text-theme-sub mt-1">{error}</p>
            </div>
          </div>
        )}

        <footer className="pt-24 pb-12 text-center space-y-4">
          <p className="text-sm text-theme-sub font-semibold tracking-tight">
            © 2026 Panboard. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6 text-xs text-theme-sub/65 font-bold uppercase tracking-wider">
            <button onClick={() => setActiveFooterModal('privacy')} className="hover:text-theme-text transition-colors cursor-pointer">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => setActiveFooterModal('terms')} className="hover:text-theme-text transition-colors cursor-pointer">Terms of Service</button>
            <span>•</span>
            <button onClick={() => setActiveFooterModal('support')} className="hover:text-theme-text transition-colors cursor-pointer">Support</button>
          </div>
        </footer>
      </div>

      {/* Floating Theme Toggle (Bottom-Left) */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 left-6 z-50 flex items-center justify-center p-3.5 bg-theme-card hover:bg-theme-border text-theme-text border border-theme-border rounded-full shadow-2xl cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group"
        title={`Switch Theme (Active: ${theme})`}
      >
        {theme === 'light' && <Sun className="h-5 w-5 text-amber-500" />}
        {theme === 'dark' && <Moon className="h-5 w-5 text-indigo-400" />}
        {theme === 'tokyo-night' && <Palette className="h-5 w-5 text-cyan-400" />}
      </button>

      {/* Footer Modals */}
      {activeFooterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-theme-card rounded-[2rem] max-w-lg w-full p-8 shadow-2xl border border-theme-border animate-in zoom-in-95 duration-300 space-y-6 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold text-theme-text capitalize">
                {activeFooterModal === 'support' ? 'Contact Support' : `${activeFooterModal} Policy`}
              </h3>
              <button 
                onClick={() => setActiveFooterModal(null)}
                className="text-theme-sub hover:text-theme-text text-sm font-semibold p-1 hover:bg-theme-border rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-sm text-theme-sub space-y-4 pr-2 custom-scrollbar">
              {activeFooterModal === 'privacy' && (
                <>
                  <p className="font-bold text-theme-text">Last Updated: July 2026</p>
                  <p>At Panboard, we prioritize your data privacy. Because our service processes your spreadsheets locally or on ephemeral server instances, we do not store your uploaded datasets permanently.</p>
                  <p className="font-semibold text-theme-text">1. Data Collection</p>
                  <p>We do not collect or sell your personal data. Ephemeral data files uploaded to our server are automatically evicted from memory and disk after 30 minutes of inactivity.</p>
                  <p className="font-semibold text-theme-text">2. Cookie Policy</p>
                  <p>We only store session preferences (like your active theme state) in your browser's local storage.</p>
                </>
              )}

              {activeFooterModal === 'terms' && (
                <>
                  <p className="font-bold text-theme-text">Last Updated: July 2026</p>
                  <p>Welcome to Panboard. By using our service, you agree to these simplified terms.</p>
                  <p className="font-semibold text-theme-text">1. Acceptable Use</p>
                  <p>Panboard is provided as an open tool for data analysis and visualization. You remain the sole owner of all datasets and charts generated on the platform.</p>
                  <p className="font-semibold text-theme-text">2. Limitation of Liability</p>
                  <p>The platform is provided "as is" without warranty of any kind. We are not liable for any data loss or analytical errors resulting from usage of this site.</p>
                </>
              )}

              {activeFooterModal === 'support' && (
                <form onSubmit={(e) => { e.preventDefault(); alert('Support message sent successfully!'); setActiveFooterModal(null); }} className="space-y-4">
                  <p>Need help? Drop us a message below and we will get back to you shortly.</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-sub uppercase tracking-wider">Your Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="you@example.com" 
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-sub uppercase tracking-wider">Message</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Describe your issue or feedback..." 
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 bg-theme-accent text-white font-bold rounded-xl hover:opacity-95 transition-opacity"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {activeFooterModal !== 'support' && (
              <div className="pt-4 border-t border-theme-border flex justify-end">
                <button 
                  onClick={() => setActiveFooterModal(null)}
                  className="px-5 py-2.5 bg-theme-accent text-white text-xs font-bold rounded-xl hover:opacity-95 transition-opacity"
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
