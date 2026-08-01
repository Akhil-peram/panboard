import React, { useEffect, useState } from 'react';
import { getVisitorStats } from '../services/api';
import type { VisitorStatsResponse } from '../services/api';
import { Users, Globe, Activity, RefreshCw, X, Shield, Clock } from 'lucide-react';

interface VisitorCounterProps {
  className?: string;
}

export const VisitorCounter: React.FC<VisitorCounterProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<VisitorStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ips' | 'logs'>('ips');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getVisitorStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load visitor stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <>
      {/* Pill Badge Trigger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          fetchStats();
        }}
        aria-label="View Visitor Count and IP Analytics"
        className={`flex items-center space-x-2 px-3 py-1.5 bg-theme-card hover:bg-theme-border text-theme-text rounded-xl border border-theme-border transition-all cursor-pointer shadow-sm group focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${className}`}
        title="Click to view IP Visitor Analytics"
      >
        <div className="relative flex items-center justify-center">
          <Globe className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500"></span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-bold">
          <span className="text-theme-sub">Visitors:</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-mono">
            {stats ? stats.total_visits.toLocaleString() : '...'}
          </span>
          <span className="text-theme-sub opacity-50">•</span>
          <span className="text-theme-sub">IPs:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-mono">
            {stats ? stats.unique_visitors : '...'}
          </span>
        </div>
      </button>

      {/* Visitor Analytics Modal */}
      {isOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="visitor-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300"
        >
          <div className="bg-theme-card rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-theme-border animate-in zoom-in-95 duration-300 space-y-6 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-theme-border">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="visitor-modal-title" className="text-lg font-bold text-theme-text flex items-center space-x-2">
                    <span>IP Visitor Analytics</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                      Live IP Tracking
                    </span>
                  </h3>
                  <p className="text-xs text-theme-sub">Unique visitor counter & IP traffic dashboard</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={fetchStats}
                  disabled={loading}
                  aria-label="Refresh visitor stats"
                  className="p-2 text-theme-sub hover:text-theme-text bg-theme-bg hover:bg-theme-border rounded-xl transition-all border border-theme-border cursor-pointer"
                  title="Refresh stats"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close modal"
                  className="p-2 text-theme-sub hover:text-theme-text bg-theme-bg hover:bg-theme-border rounded-xl transition-all border border-theme-border cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-theme-bg p-4 rounded-2xl border border-theme-border space-y-1">
                <div className="flex items-center justify-between text-xs text-theme-sub font-semibold">
                  <span>Total Visits</span>
                  <Activity className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-theme-text font-mono">
                  {stats ? stats.total_visits.toLocaleString() : '0'}
                </div>
                <div className="text-[10px] text-theme-sub">Hits logged</div>
              </div>

              <div className="bg-theme-bg p-4 rounded-2xl border border-theme-border space-y-1">
                <div className="flex items-center justify-between text-xs text-theme-sub font-semibold">
                  <span>Unique IPs</span>
                  <Users className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-theme-text font-mono">
                  {stats ? stats.unique_visitors : '0'}
                </div>
                <div className="text-[10px] text-theme-sub">Distinct client addresses</div>
              </div>

              <div className="bg-theme-bg p-4 rounded-2xl border border-theme-border space-y-1">
                <div className="flex items-center justify-between text-xs text-theme-sub font-semibold">
                  <span>Your Current IP</span>
                  <Shield className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono truncate">
                  {stats ? stats.your_ip : '127.0.0.1'}
                </div>
                <div className="text-[10px] text-emerald-500 font-semibold flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span> Connected
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-theme-border pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('ips')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ips'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-theme-sub hover:text-theme-text bg-theme-bg hover:bg-theme-border'
                }`}
              >
                Visiting IP Breakdown ({stats?.ip_breakdown?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-theme-sub hover:text-theme-text bg-theme-bg hover:bg-theme-border'
                }`}
              >
                Live Traffic Feed ({stats?.recent_logs?.length || 0})
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto max-h-64 custom-scrollbar space-y-3">
              {activeTab === 'ips' ? (
                <div className="space-y-2">
                  {!stats?.ip_breakdown || stats.ip_breakdown.length === 0 ? (
                    <div className="text-center py-8 text-xs text-theme-sub">No IP records logged yet.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-theme-border">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-theme-bg border-b border-theme-border text-[11px] uppercase tracking-wider text-theme-sub font-bold">
                            <th className="p-3">IP Address</th>
                            <th className="p-3">Visits</th>
                            <th className="p-3">Last Active</th>
                            <th className="p-3">Client Agent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border">
                          {stats.ip_breakdown.map((item, idx) => (
                            <tr key={idx} className="hover:bg-theme-bg/60 transition-colors">
                              <td className="p-3 font-mono font-bold text-theme-text flex items-center space-x-2">
                                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                                <span>{item.ip}</span>
                                {item.ip === stats.your_ip && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-500/20 text-indigo-500 rounded">YOU</span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                {item.visits}
                              </td>
                              <td className="p-3 text-theme-sub font-medium flex items-center">
                                <Clock className="h-3 w-3 mr-1 opacity-70" />
                                {formatTimestamp(item.last_seen)}
                              </td>
                              <td className="p-3 text-theme-sub text-[11px] max-w-xs truncate font-mono">
                                {item.user_agent || 'Browser Client'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {!stats?.recent_logs || stats.recent_logs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-theme-sub">No traffic feed recorded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {stats.recent_logs.map((log, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-theme-bg rounded-xl border border-theme-border text-xs">
                          <div className="flex items-center space-x-2.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span className="font-mono font-bold text-theme-text">{log.ip}</span>
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-theme-border text-theme-sub rounded">
                              {log.endpoint}
                            </span>
                          </div>
                          <span className="text-[11px] text-theme-sub font-mono">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-theme-border flex justify-between items-center text-xs text-theme-sub">
              <span>Visitor counts updated automatically in real-time</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VisitorCounter;
