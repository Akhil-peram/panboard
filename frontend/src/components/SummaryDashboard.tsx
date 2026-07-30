import React, { useState, useMemo } from 'react';
import { transformDataset, getExportUrl } from '../services/api';
import type { UploadResponse, TransformPayload } from '../services/api';
import { toPng, toSvg } from 'html-to-image';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  LayoutDashboard, 
  BarChart3, 
  Table as TableIcon, 
  Info, 
  Search,
  Filter,
  Download,
  Activity,
  Type,
  Hash,
  AlertCircle,
  Settings,
  Wand2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  FileText
} from 'lucide-react';

interface SummaryDashboardProps {
  data: UploadResponse;
  onDataUpdate: (newData: UploadResponse) => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ data, onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'data'>('overview');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'scatter' | 'pie'>('bar');
  const [xAxis, setXAxis] = useState(data?.columns?.[0] || '');
  const [yAxis, setYAxis] = useState(data?.numeric_columns?.[0] || data?.columns?.[0] || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [sampleSize, setSampleSize] = useState(20);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [aggFunc, setAggFunc] = useState<'none' | 'sum' | 'mean' | 'count' | 'min' | 'max'>('none');

  // Transformations state
  const [transformingCol, setTransformingCol] = useState<{ name: string; action: 'impute' | 'cast' | 'rename' } | null>(null);
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'value'>('mean');
  const [imputeValue, setImputeValue] = useState('');
  const [castType, setCastType] = useState<'int' | 'float' | 'str' | 'datetime'>('int');
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);

  // Sorting & Filtering state
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [filterCol, setFilterCol] = useState(data?.columns?.[0] || '');
  const [filterOp, setFilterOp] = useState('==');
  const [filterVal, setFilterVal] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  const { columns, info, categorical_summary, sample_data, stats, numeric_columns, categorical_columns } = data || {};

  const startTransform = (colName: string, action: 'impute' | 'cast' | 'rename') => {
    setTransformingCol({ name: colName, action });
    setTransformError(null);
    setIsTransforming(false);
    
    // Set sensible defaults based on column data type
    const colType = info[colName]?.type || '';
    const isNumeric = colType.includes('int') || colType.includes('float') || numeric_columns.includes(colName);
    
    if (action === 'impute') {
      setImputeStrategy(isNumeric ? 'mean' : 'mode');
      setImputeValue('');
    } else if (action === 'rename') {
      setImputeValue(colName);
    } else {
      setCastType(isNumeric ? 'int' : 'str');
    }
  };

  const handleExecuteTransform = async () => {
    if (!transformingCol || !data.dataset_id) return;
    
    setIsTransforming(true);
    setTransformError(null);
    
    try {
      const payload: TransformPayload = {
        action: transformingCol.action,
        column: transformingCol.name,
      };
      
      if (transformingCol.action === 'impute') {
        payload.strategy = imputeStrategy;
        if (imputeStrategy === 'value') {
          const colType = info[transformingCol.name]?.type || '';
          const isNumeric = colType.includes('int') || colType.includes('float') || numeric_columns.includes(transformingCol.name);
          if (isNumeric) {
            payload.fill_value = Number(imputeValue);
            if (isNaN(payload.fill_value)) {
              throw new Error('Custom fill value must be a valid number.');
            }
          } else {
            payload.fill_value = imputeValue;
          }
        }
      } else if (transformingCol.action === 'rename') {
        if (!imputeValue.trim()) {
          throw new Error('New column name cannot be empty.');
        }
        payload.new_name = imputeValue.trim();
      } else {
        payload.data_type = castType;
      }
      
      const updatedData = await transformDataset(data.dataset_id, payload);
      onDataUpdate(updatedData);
      setTransformingCol(null);
    } catch (err: any) {
      setTransformError(err.message || 'An error occurred during transformation.');
    } finally {
      setIsTransforming(false);
    }
  };

  const handleResetDataset = async () => {
    if (!data.dataset_id) return;
    if (!window.confirm("Are you sure you want to reset all filters and transformations to the original file?")) return;
    try {
      const updatedData = await transformDataset(data.dataset_id, { action: 'reset', column: '' });
      onDataUpdate(updatedData);
      setSortCol(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reset dataset.');
    }
  };

  const handleApplyFilter = async () => {
    if (!data.dataset_id || !filterCol || !filterVal) return;
    setIsFiltering(true);
    try {
      const updatedData = await transformDataset(data.dataset_id, {
        action: 'filter',
        column: filterCol,
        operator: filterOp as any,
        value: filterVal,
      });
      onDataUpdate(updatedData);
      setFilterVal('');
      setShowFilterBar(false);
    } catch (err: any) {
      alert(err.message || 'Failed to apply filter.');
    } finally {
      setIsFiltering(false);
    }
  };

  const handleExportPNG = () => {
    const container = document.getElementById('chart-svg-container');
    if (!container) return;

    const activeTheme = document.body.className.match(/theme-[a-z\-]+/)?.[0] || 'theme-light';
    const isDark = activeTheme === 'theme-dark' || activeTheme === 'theme-tokyo-night';
    const bgColor = isDark ? (activeTheme === 'theme-tokyo-night' ? '#1f2335' : '#1e293b') : '#ffffff';

    toPng(container, {
      backgroundColor: bgColor,
      pixelRatio: 2,
    })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `panboard_chart_${chartType}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })
    .catch((err) => {
      console.error('Export failed:', err);
      alert('Failed to export chart as PNG.');
    });
  };

  const handleExportSVG = () => {
    const container = document.getElementById('chart-svg-container');
    if (!container) return;

    const activeTheme = document.body.className.match(/theme-[a-z\-]+/)?.[0] || 'theme-light';
    const isDark = activeTheme === 'theme-dark' || activeTheme === 'theme-tokyo-night';
    const bgColor = isDark ? (activeTheme === 'theme-tokyo-night' ? '#1f2335' : '#1e293b') : '#ffffff';

    toSvg(container, {
      backgroundColor: bgColor,
    })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `panboard_chart_${chartType}.svg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })
    .catch((err) => {
      console.error('Export failed:', err);
      alert('Failed to export chart as SVG.');
    });
  };

  const handleSortClick = (colName: string) => {
    if (sortCol === colName) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colName);
      setSortDirection('asc');
    }
  };

  // Data for custom charts
  const customChartData = useMemo(() => {
    if (!sample_data) return [];
    
    if (aggFunc === 'none') {
      return sample_data.slice(0, sampleSize).map(row => {
        const xVal = row[xAxis];
        const rawY = row[yAxis];
        let yVal = 0;
        if (typeof rawY === 'number') {
          yVal = rawY;
        } else if (typeof rawY === 'string') {
          yVal = parseFloat(rawY) || 0;
        }
        return {
          x: xVal,
          y: yVal,
          value: yVal, // Unified property for Recharts type compatibility
          name: xVal?.toString() || ''
        };
      });
    }

    // Grouping & Aggregation by X
    const groups: Record<string, number[]> = {};
    sample_data.forEach(row => {
      const xKey = row[xAxis]?.toString() ?? 'N/A';
      const rawY = row[yAxis];
      let yVal = 0;
      if (typeof rawY === 'number') yVal = rawY;
      else if (typeof rawY === 'string') yVal = parseFloat(rawY) || 0;

      if (!groups[xKey]) groups[xKey] = [];
      groups[xKey].push(yVal);
    });

    return Object.entries(groups).slice(0, sampleSize).map(([xKey, vals]) => {
      let finalVal = 0;
      if (aggFunc === 'sum') finalVal = vals.reduce((a, b) => a + b, 0);
      else if (aggFunc === 'mean') finalVal = vals.reduce((a, b) => a + b, 0) / vals.length;
      else if (aggFunc === 'count') finalVal = vals.length;
      else if (aggFunc === 'min') finalVal = Math.min(...vals);
      else if (aggFunc === 'max') finalVal = Math.max(...vals);

      const rounded = Number(finalVal.toFixed(2));
      return {
        x: xKey,
        y: rounded,
        value: rounded,
        name: xKey
      };
    });
  }, [sample_data, xAxis, yAxis, sampleSize, aggFunc]);

  // Data for categorical charts (Frequency)
  const frequencyData = useMemo(() => {
    if (!categorical_columns || !categorical_summary) return [];
    const col = categorical_columns.includes(xAxis) ? xAxis : categorical_columns[0];
    if (!col || !categorical_summary[col]) return [];
    return categorical_summary[col];
  }, [categorical_summary, categorical_columns, xAxis]);

  // Filtered sample data
  const filteredData = useMemo(() => {
    if (!sample_data) return [];
    if (!searchTerm) return sample_data;
    return sample_data.filter(row => 
      Object.values(row).some(val => 
        val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [sample_data, searchTerm]);

  // Sorted and filtered sample data
  const sortedFilteredData = useMemo(() => {
    if (!sortCol) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      
      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = aVal.toString().toLowerCase();
      const bStr = bVal.toString().toLowerCase();
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortCol, sortDirection]);

  if (!data || !data.info) {
    return (
      <div className="bg-theme-card p-12 rounded-2xl shadow-xl border border-theme-border text-center flex flex-col items-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-semibold text-theme-text">Unable to process data</h3>
        <p className="text-theme-sub mt-2 max-w-md">There might be an issue with the file format or the server response. Please try uploading a clean CSV or Excel file.</p>
      </div>
    );
  }

  const renderChart = () => {
    const isCategoricalX = categorical_columns.includes(xAxis);
    const isPie = chartType === 'pie';
    const chartData = isPie ? frequencyData : customChartData;

    if (chartData.length === 0) {
      return (
        <div className="h-[400px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
          No data available for the selected parameters
        </div>
      );
    }

    const commonProps = {
      width: "100%" as const,
      height: 400,
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="x" angle={-45} textAnchor="end" interval={0} height={80} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="x" angle={-45} textAnchor="end" interval={0} height={80} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorY)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid stroke="#f1f5f9" />
              <XAxis type={isCategoricalX ? "category" : "number"} dataKey="x" name={xAxis} stroke="#94a3b8" fontSize={12} />
              <YAxis type="number" dataKey="y" name={yAxis} stroke="#94a3b8" fontSize={12} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Scatter name="Data Points" data={customChartData} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={frequencyData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {frequencyData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="x" angle={-45} textAnchor="end" interval={0} height={80} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tab Navigation */}
      <nav aria-label="Dashboard views" className="bg-theme-card p-2 rounded-2xl shadow-sm border border-theme-border">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div role="tablist" aria-label="Dashboard view tabs" className="flex items-center space-x-1 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            <button
              type="button"
              role="tab"
              id="tab-overview"
              aria-selected={activeTab === 'overview'}
              aria-controls="tabpanel-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-theme-accent/40 ${
                activeTab === 'overview' ? 'bg-theme-accent-bg text-theme-accent-text shadow-sm' : 'text-theme-sub hover:bg-theme-border'
              }`}
            >
              <LayoutDashboard aria-hidden="true" className="h-4 w-4 mr-2 shrink-0" />
              Overview
            </button>
            <button
              type="button"
              role="tab"
              id="tab-charts"
              aria-selected={activeTab === 'charts'}
              aria-controls="tabpanel-charts"
              onClick={() => setActiveTab('charts')}
              className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-theme-accent/40 ${
                activeTab === 'charts' ? 'bg-theme-accent-bg text-theme-accent-text shadow-sm' : 'text-theme-sub hover:bg-theme-border'
              }`}
            >
              <BarChart3 aria-hidden="true" className="h-4 w-4 mr-2 shrink-0" />
              Visualize
            </button>
            <button
              type="button"
              role="tab"
              id="tab-data"
              aria-selected={activeTab === 'data'}
              aria-controls="tabpanel-data"
              onClick={() => setActiveTab('data')}
              className={`flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-theme-accent/40 ${
                activeTab === 'data' ? 'bg-theme-accent-bg text-theme-accent-text shadow-sm' : 'text-theme-sub hover:bg-theme-border'
              }`}
            >
              <TableIcon aria-hidden="true" className="h-4 w-4 mr-2 shrink-0" />
              Data Table
            </button>
          </div>
          <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 px-2 sm:px-4">
            <div className="text-xs text-theme-sub font-medium flex items-center truncate">
              <Activity aria-hidden="true" className="h-3 w-3 mr-1.5 text-green-500 shrink-0" />
              <span className="truncate">{data.filename} • {data.row_count} rows</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {/* Export Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={showExportDropdown}
                  aria-label="Export cleaned dataset format options"
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl transition-all duration-300 border border-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-theme-accent/40"
                  title="Export cleaned dataset"
                >
                  <Download aria-hidden="true" className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span>Export</span>
                  <ChevronDown aria-hidden="true" className="h-3 w-3 ml-0.5 shrink-0" />
                </button>
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-theme-card border border-theme-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <a
                      href={getExportUrl(data.dataset_id, 'csv')}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setShowExportDropdown(false)}
                      className="flex items-center px-4 py-2 text-xs font-medium text-theme-text hover:bg-theme-border transition-colors"
                    >
                      <FileText aria-hidden="true" className="h-4 w-4 mr-2 text-emerald-400" />
                      CSV File (.csv)
                    </a>
                    <a
                      href={getExportUrl(data.dataset_id, 'xlsx')}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setShowExportDropdown(false)}
                      className="flex items-center px-4 py-2 text-xs font-medium text-theme-text hover:bg-theme-border transition-colors"
                    >
                      <FileSpreadsheet aria-hidden="true" className="h-4 w-4 mr-2 text-blue-400" />
                      Excel Workbook (.xlsx)
                    </a>
                    <a
                      href={getExportUrl(data.dataset_id, 'json')}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setShowExportDropdown(false)}
                      className="flex items-center px-4 py-2 text-xs font-medium text-theme-text hover:bg-theme-border transition-colors"
                    >
                      <FileCode aria-hidden="true" className="h-4 w-4 mr-2 text-amber-400" />
                      JSON Format (.json)
                    </a>
                  </div>
                )}
              </div>
              <button 
                type="button"
                onClick={handleResetDataset}
                aria-label="Reset dataset filters and transformations"
                className="flex items-center px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 border border-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                title="Revert all cleaning, transformations, and filters."
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </nav>

      {activeTab === 'overview' && (
        <div id="tabpanel-overview" role="tabpanel" aria-labelledby="tab-overview" className="space-y-8 animate-in fade-in duration-500">
          {/* AI Data Insights & Health Score */}
          {data.insights && (
            <div className="bg-theme-card p-4 sm:p-6 rounded-2xl shadow-sm border border-theme-border space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-theme-border pb-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-theme-text flex items-center truncate">
                      Automated Data Quality & Audit
                    </h3>
                    <p className="text-xs text-theme-sub truncate">Real-time statistical anomaly and missingness checks</p>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto space-x-3 bg-theme-bg px-4 py-2 rounded-xl border border-theme-border shrink-0">
                  <span className="text-xs font-semibold text-theme-sub">Data Health Score:</span>
                  <span className={`text-sm font-extrabold ${data.insights.health_score >= 80 ? 'text-emerald-400' : data.insights.health_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {data.insights.health_score}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.insights.items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-theme-border bg-theme-bg/50 flex items-start space-x-3">
                    {item.type === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : item.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-bold text-theme-text">{item.title}</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-theme-card text-theme-sub border border-theme-border shrink-0">{item.category}</span>
                      </div>
                      <p className="text-xs text-theme-sub mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Rows" value={data.row_count.toLocaleString()} icon={<Hash className="h-5 w-5" />} color="indigo" />
            <StatCard title="Columns" value={columns.length} icon={<LayoutDashboard className="h-5 w-5" />} color="blue" />
            <StatCard title="Numeric Features" value={numeric_columns.length} icon={<Activity className="h-5 w-5" />} color="emerald" />
            <StatCard title="Categorical" value={categorical_columns.length} icon={<Type className="h-5 w-5" />} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column Health & Types */}
            <div className="lg:col-span-2 bg-theme-card rounded-2xl shadow-sm border border-theme-border overflow-hidden">
              <div className="px-6 py-4 border-b border-theme-border bg-theme-bg flex justify-between items-center">
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider flex items-center">
                  <Info className="h-4 w-4 mr-2 text-theme-accent" />
                  Schema Analysis
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-theme-border">
                  <thead className="bg-theme-bg">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Column</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Unique</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Health</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-theme-card divide-y divide-theme-border">
                    {columns.map(col => {
                      const missingPercent = (info[col].missing / data.row_count) * 100;
                      const healthScore = Math.round(100 - missingPercent);
                      return (
                        <tr key={col} className="hover:bg-theme-border/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-theme-text">{col}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              numeric_columns.includes(col) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-400'
                            }`}>
                              {info[col].type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-theme-text">{info[col].unique.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-16 bg-theme-border rounded-full h-1.5 mr-2">
                                <div 
                                  className={`h-1.5 rounded-full ${healthScore < 100 ? 'bg-amber-400' : 'bg-green-400'}`} 
                                  style={{ width: `${healthScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-theme-sub">{healthScore}%</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-[180px]">
                              {info[col].missing > 0 && (
                                <button
                                  onClick={() => startTransform(col, 'impute')}
                                  className="inline-flex items-center px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold rounded-lg transition-all duration-300"
                                >
                                  <Wand2 className="h-3 w-3 mr-1" />
                                  Impute
                                </button>
                              )}
                              <button
                                onClick={() => startTransform(col, 'cast')}
                                className="inline-flex items-center px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg transition-all duration-300"
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Cast
                              </button>
                              <button
                                onClick={() => startTransform(col, 'rename')}
                                className="inline-flex items-center px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold rounded-lg transition-all duration-300"
                              >
                                <Type className="h-3 w-3 mr-1" />
                                Rename
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Summary Stats */}
            <div className="bg-theme-card rounded-2xl shadow-sm border border-theme-border overflow-hidden">
              <div className="px-6 py-4 border-b border-theme-border bg-theme-bg">
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-theme-accent" />
                  Key Metrics
                </h3>
              </div>
              <div className="p-0">
                {numeric_columns.slice(0, 6).map(col => (
                  <div key={col} className="px-6 py-4 border-b border-theme-border last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-theme-sub uppercase truncate pr-4">{col}</span>
                      <span className="text-sm font-bold text-theme-text">{stats[col].mean.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-theme-sub">
                      <span>Min: {stats[col].min.toLocaleString()}</span>
                      <span>Max: {stats[col].max.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {numeric_columns.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">No numeric data found</div>
                )}
              </div>
            </div>
          </div>

          {/* Correlation Heatmap Section */}
          {numeric_columns.length > 1 && data.correlation && (
            <div className="bg-theme-card rounded-2xl shadow-sm border border-theme-border overflow-hidden p-4 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-theme-border">
                <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-theme-accent shrink-0" />
                  Feature Correlation Matrix
                </h3>
                <span className="text-xs text-theme-sub font-medium">Pearson coefficient (-1 to +1)</span>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-3 text-left text-xs font-bold text-theme-sub bg-theme-bg rounded-tl-xl"></th>
                        {numeric_columns.map(col => (
                          <th key={col} className="p-3 text-center text-xs font-bold text-theme-sub bg-theme-bg truncate max-w-[120px]" title={col}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {numeric_columns.map((rowCol) => (
                        <tr key={rowCol} className="hover:bg-theme-border/20 transition-colors">
                          <td className="p-3 text-left text-xs font-bold text-theme-text bg-theme-bg truncate max-w-[150px] rounded-l-xl" title={rowCol}>
                            {rowCol}
                          </td>
                          {numeric_columns.map((colCol) => {
                            const val = data.correlation[rowCol]?.[colCol] ?? 0;
                            const absVal = Math.abs(val);
                            // Contrast threshold at 0.4: if high correlation, text is white, else use theme primary text variable
                            const textStyle = absVal > 0.4 ? { color: '#ffffff' } : { color: 'var(--theme-text)' };
                            
                            // If dark theme or tokyo-night, reduce lightness range to maintain contrast/vibrancy
                            const isDarkTheme = document.body.className.includes('theme-dark') || document.body.className.includes('theme-tokyo-night');
                            const adjustedLightness = isDarkTheme 
                              ? 30 + (absVal * 30) // 30% to 60% (darker fills)
                              : 100 - (absVal * 40); // 100% to 60% (lighter fills)
                            const bgStyle = val >= 0 
                              ? { backgroundColor: `hsl(243, 75%, ${adjustedLightness}%)` }
                              : { backgroundColor: `hsl(347, 77%, ${adjustedLightness}%)` };
                              
                            return (
                              <td 
                                key={colCol} 
                                style={{ ...bgStyle, ...textStyle }}
                                className="p-3 text-center text-xs font-bold border border-theme-border/50 transition-all cursor-help select-none"
                                title={`Correlation: ${val.toFixed(3)}`}
                              >
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'charts' && (
        <div id="tabpanel-charts" role="tabpanel" aria-labelledby="tab-charts" className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Controls Panel */}
          <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-theme-border space-y-6 h-fit">
            <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider flex items-center">
              <Filter aria-hidden="true" className="h-4 w-4 mr-2 text-theme-accent" />
              Chart Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Visual Type</label>
                <div role="group" aria-label="Select chart visual type" className="grid grid-cols-2 gap-2">
                  {(['bar', 'line', 'area', 'scatter', 'pie'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={chartType === type}
                      onClick={() => setChartType(type)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        chartType === type 
                          ? 'bg-theme-accent border-theme-accent text-white shadow-md' 
                          : 'bg-theme-card border-theme-border text-theme-text hover:border-theme-accent'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {chartType !== 'pie' && (
                <>
                  <div>
                    <label htmlFor="chart-x-axis-select" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">X-Axis (Labels)</label>
                    <select 
                      id="chart-x-axis-select"
                      aria-label="X-Axis column"
                      value={xAxis} 
                      onChange={(e) => setXAxis(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:ring-2 focus:ring-theme-accent focus:outline-none appearance-none"
                    >
                      {columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="chart-y-axis-select" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Y-Axis (Values)</label>
                    <select 
                      id="chart-y-axis-select"
                      aria-label="Y-Axis column"
                      value={yAxis} 
                      onChange={(e) => setYAxis(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:ring-2 focus:ring-theme-accent focus:outline-none appearance-none"
                    >
                      {numeric_columns.map(col => <option key={col} value={col}>{col}</option>)}
                      {numeric_columns.length === 0 && <option value="">No Numeric Data</option>}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="chart-agg-func-select" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Aggregation</label>
                    <select 
                      id="chart-agg-func-select"
                      aria-label="Aggregation method"
                      value={aggFunc} 
                      onChange={(e) => setAggFunc(e.target.value as any)}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:ring-2 focus:ring-theme-accent focus:outline-none appearance-none"
                    >
                      <option value="none">Raw Rows</option>
                      <option value="sum">Sum</option>
                      <option value="mean">Average (Mean)</option>
                      <option value="count">Count</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                    </select>
                  </div>
                </>
              )}

              {chartType === 'pie' && (
                <div>
                  <label htmlFor="chart-category-select" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Select Category</label>
                  <select 
                    id="chart-category-select"
                    aria-label="Select category column for pie chart"
                    value={xAxis} 
                    onChange={(e) => setXAxis(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text focus:ring-2 focus:ring-theme-accent focus:outline-none appearance-none"
                  >
                    {categorical_columns.map(col => <option key={col} value={col}>{col}</option>)}
                    {categorical_columns.length === 0 && <option value="">No Categorical Data</option>}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="chart-sample-size-range" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Sample Size: {sampleSize}</label>
                <input 
                  id="chart-sample-size-range"
                  aria-label="Chart sample size"
                  aria-valuenow={sampleSize}
                  type="range" min="5" max="100" step="5"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-accent"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                type="button"
                onClick={handleExportPNG}
                aria-label="Export visualization chart as PNG image"
                className="w-full flex items-center justify-center px-4 py-2.5 bg-theme-accent text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5 mr-2" />
                Export as PNG
              </button>
              <button 
                type="button"
                onClick={handleExportSVG}
                aria-label="Export visualization chart as SVG vector image"
                className="w-full flex items-center justify-center px-4 py-2.5 bg-theme-text text-theme-card rounded-xl text-xs font-bold hover:opacity-90 transition-opacity border border-theme-border"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5 mr-2" />
                Export as SVG
              </button>
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="lg:col-span-3 bg-theme-card p-8 rounded-2xl shadow-sm border border-theme-border min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold text-theme-text capitalize">{chartType} Analysis</h3>
                <p className="text-sm text-theme-sub mt-1">
                  {chartType === 'pie' ? `Distribution of ${xAxis}` : `${yAxis} by ${xAxis}`}
                </p>
              </div>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-theme-accent-bg text-theme-accent-text text-[10px] font-bold rounded-full uppercase tracking-tighter">Live Preview</span>
              </div>
            </div>
            
            <div id="chart-svg-container" className="flex-1 w-full h-[400px]">
              {renderChart()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div id="tabpanel-data" role="tabpanel" aria-labelledby="tab-data" className="bg-theme-card rounded-2xl shadow-sm border border-theme-border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="px-8 py-6 border-b border-theme-border flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-theme-text tracking-tight flex items-center">
                  Data Explorer
                  <span className="ml-3 px-2 py-0.5 bg-theme-bg text-theme-sub text-[10px] font-bold rounded uppercase">Sample</span>
                </h3>
                <p className="text-sm text-theme-sub mt-0.5">Showing first {sortedFilteredData.length} records of {data.row_count} total</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                  <Search aria-hidden="true" className="h-4 w-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-theme-sub" />
                  <input 
                    type="text" 
                    placeholder="Search in data..." 
                    aria-label="Search in dataset records"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-theme-bg border border-theme-border rounded-xl text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent transition-all"
                  />
                </div>
                <button
                  type="button"
                  aria-expanded={showFilterBar}
                  aria-label="Toggle dataset column filter toolbar"
                  onClick={() => {
                    setShowFilterBar(!showFilterBar);
                    if (!filterCol && columns.length > 0) setFilterCol(columns[0]);
                  }}
                  className={`flex items-center justify-center px-4 py-2.5 border rounded-xl text-xs font-bold transition-all ${
                    showFilterBar ? 'bg-theme-accent-bg border-theme-accent/55 text-theme-accent-text' : 'bg-theme-card border-theme-border text-theme-text hover:border-theme-accent'
                  }`}
                >
                  <Filter aria-hidden="true" className="h-4 w-4 mr-2" />
                  Filter Dataset
                </button>
              </div>
            </div>

            {showFilterBar && (
              <div className="p-4 bg-theme-bg rounded-2xl border border-theme-border flex flex-wrap items-end gap-4 animate-in slide-in-from-top duration-300">
                <div className="flex flex-col">
                  <label htmlFor="dataset-filter-column" className="text-[10px] font-bold text-theme-sub uppercase mb-1 tracking-wider">Column</label>
                  <select
                    id="dataset-filter-column"
                    aria-label="Select column to filter by"
                    value={filterCol}
                    onChange={(e) => setFilterCol(e.target.value)}
                    className="bg-theme-card border border-theme-border rounded-xl px-3 py-2 text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
                  >
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col">
                  <label htmlFor="dataset-filter-operator" className="text-[10px] font-bold text-theme-sub uppercase mb-1 tracking-wider">Operator</label>
                  <select
                    id="dataset-filter-operator"
                    aria-label="Select comparison operator"
                    value={filterOp}
                    onChange={(e) => setFilterOp(e.target.value)}
                    className="bg-theme-card border border-theme-border rounded-xl px-3 py-2 text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
                  >
                    <option value="==">Equals (==)</option>
                    <option value="!=">Not Equals (!=)</option>
                    <option value=">">Greater Than (&gt;)</option>
                    <option value="<">Less Than (&lt;)</option>
                    <option value=">=">Greater or Equal (&gt;=)</option>
                    <option value="<=">Less or Equal (&lt;=)</option>
                    <option value="contains">Contains (text)</option>
                  </select>
                </div>

                <div className="flex flex-col flex-1 min-w-[120px]">
                  <label htmlFor="dataset-filter-value" className="text-[10px] font-bold text-theme-sub uppercase mb-1 tracking-wider">Comparison Value</label>
                  <input
                    id="dataset-filter-value"
                    aria-label="Enter comparison value for filter"
                    type="text"
                    placeholder="Enter value..."
                    value={filterVal}
                    onChange={(e) => setFilterVal(e.target.value)}
                    className="bg-theme-card border border-theme-border rounded-xl px-3 py-2.5 text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleApplyFilter}
                    disabled={isFiltering}
                    className="px-5 py-2.5 bg-theme-accent hover:opacity-90 disabled:bg-theme-accent/50 text-white text-xs font-bold rounded-xl shadow-md transition-all h-[38px] flex items-center"
                  >
                    {isFiltering ? 'Filtering...' : 'Apply Filter'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="min-w-full divide-y divide-theme-border">
              <thead className="bg-theme-bg sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  {columns.map(col => (
                    <th 
                      key={col} 
                      onClick={() => handleSortClick(col)}
                      aria-sort={sortCol === col ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="px-6 py-4 text-left text-xs font-bold text-theme-sub uppercase tracking-wider cursor-pointer hover:bg-theme-border hover:text-theme-text transition-colors select-none group"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col}</span>
                        {sortCol === col ? (
                          sortDirection === 'asc' ? <span className="text-theme-accent" aria-hidden="true">▲</span> : <span className="text-theme-accent" aria-hidden="true">▼</span>
                        ) : (
                          <span className="opacity-30 group-hover:opacity-100 transition-opacity" aria-hidden="true">⇅</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-theme-card divide-y divide-theme-border">
                {sortedFilteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-theme-accent-bg/10 transition-colors group">
                    {columns.map(col => (
                      <td key={col} className="px-6 py-4 text-sm text-theme-text whitespace-nowrap group-hover:text-theme-accent">
                        {row[col]?.toString() || <span className="text-theme-sub italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedFilteredData.length === 0 && (
              <div className="p-12 text-center text-theme-sub">
                <Search aria-hidden="true" className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No matches found for "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transformation Modal */}
      {transformingCol && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="transform-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        >
          <div className="bg-theme-card rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-theme-border animate-in zoom-in-95 duration-300 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-theme-accent-text bg-theme-accent-bg px-2.5 py-1 rounded-md">
                  {transformingCol.action === 'impute' ? 'Data Imputation' : transformingCol.action === 'rename' ? 'Rename Column' : 'Type Casting'}
                </span>
                <h3 id="transform-modal-title" className="text-xl font-bold text-theme-text mt-2">
                  {transformingCol.name}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setTransformingCol(null)}
                aria-label="Close transformation dialog"
                className="text-theme-sub hover:text-theme-text text-sm font-semibold p-1 hover:bg-theme-border rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            {transformingCol.action === 'impute' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="impute-strategy-select" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Strategy</label>
                  <select 
                    id="impute-strategy-select"
                    aria-label="Select missing value imputation strategy"
                    value={imputeStrategy}
                    onChange={(e: any) => setImputeStrategy(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent appearance-none"
                  >
                    {/* Only show Mean/Median if numeric */}
                    {(info[transformingCol.name]?.type.includes('int') || 
                      info[transformingCol.name]?.type.includes('float') || 
                      numeric_columns.includes(transformingCol.name)) && (
                      <>
                        <option value="mean">Mean (Average)</option>
                        <option value="median">Median (Middle Value)</option>
                      </>
                    )}
                    <option value="mode">Mode (Most Frequent)</option>
                    <option value="value">Custom Value</option>
                  </select>
                </div>

                {imputeStrategy === 'value' && (
                  <div className="animate-in slide-in-from-top duration-300">
                    <label htmlFor="impute-custom-value-input" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Custom Value</label>
                    <input
                      id="impute-custom-value-input"
                      aria-label="Custom imputation value"
                      type="text"
                      placeholder="Enter value..."
                      value={imputeValue}
                      onChange={(e) => setImputeValue(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent"
                    />
                  </div>
                )}
              </div>
            ) : transformingCol.action === 'rename' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="rename-column-input" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">New Column Name</label>
                  <input
                    id="rename-column-input"
                    aria-label="New column name"
                    type="text"
                    placeholder="Enter new column name..."
                    value={imputeValue}
                    onChange={(e) => setImputeValue(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="cast-type-select" className="block text-[10px] font-bold text-theme-sub uppercase mb-1.5 tracking-wider">Target Data Type</label>
                  <select 
                    id="cast-type-select"
                    aria-label="Target column data type"
                    value={castType}
                    onChange={(e: any) => setCastType(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent/20 focus:border-theme-accent appearance-none"
                  >
                    <option value="int">Integer (Whole Number)</option>
                    <option value="float">Float (Decimal Number)</option>
                    <option value="str">String (Text)</option>
                    <option value="datetime">Datetime</option>
                  </select>
                </div>
              </div>
            )}

            {transformError && (
              <div className="bg-red-500/10 text-red-500 text-xs font-semibold p-3.5 rounded-xl border border-red-500/20 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 mr-1 text-red-500 flex-shrink-0" />
                <span>{transformError}</span>
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setTransformingCol(null)}
                disabled={isTransforming}
                className="flex-1 px-5 py-3 text-sm font-bold text-theme-text bg-theme-bg hover:bg-theme-border rounded-xl transition-all border border-theme-border"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransform}
                disabled={isTransforming}
                className="flex-1 flex items-center justify-center px-5 py-3 text-sm font-bold text-white bg-theme-accent hover:opacity-90 disabled:opacity-50 rounded-xl shadow-lg transition-all"
              >
                {isTransforming ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Applying...
                  </>
                ) : (
                  'Apply Transform'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-theme-accent-bg text-theme-accent-text',
    blue: 'bg-sky-500/10 text-sky-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="bg-theme-card p-6 rounded-2xl shadow-sm border border-theme-border flex items-center group hover:shadow-md transition-all">
      <div className={`p-4 rounded-xl mr-5 transition-transform group-hover:scale-110 ${colorClasses[color] || colorClasses.indigo}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-theme-sub uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-theme-text tracking-tight">{value}</p>
      </div>
    </div>
  );
};

export default SummaryDashboard;
