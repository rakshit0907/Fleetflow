import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Layers, X } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ data, onResult, searchKeys = [], sortOptions = [], filterOptions = [], groupByOptions = [] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [activeFilters, setActiveFilters] = useState({});
  const [groupBy, setGroupBy] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef();

  useEffect(() => {
    let result = [...(data || [])];

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(item =>
        searchKeys.some(key => {
          const val = item[key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Filter
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(item => String(item[key]) === value);
      }
    });

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let aVal = a[sortKey], bVal = b[sortKey];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Group by
    if (groupBy) {
      const groups = {};
      result.forEach(item => {
        const key = item[groupBy] || 'Other';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });
      onResult(result, groups, groupBy);
    } else {
      onResult(result, null, '');
    }
  }, [query, sortKey, sortDir, activeFilters, groupBy, data]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeCount = Object.values(activeFilters).filter(Boolean).length + (sortKey ? 1 : 0) + (groupBy ? 1 : 0);

  const clearAll = () => {
    setQuery('');
    setSortKey('');
    setSortDir('asc');
    setActiveFilters({});
    setGroupBy('');
  };

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-row">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            id="global-search"
          />
          {query && <button className="search-clear" onClick={() => setQuery('')}><X size={14} /></button>}
        </div>

        <button className={`toolbar-btn ${showPanel ? 'active' : ''}`} onClick={() => setShowPanel(!showPanel)}>
          <SlidersHorizontal size={15} />
          <span>Controls</span>
          {activeCount > 0 && <span className="badge">{activeCount}</span>}
        </button>

        {activeCount > 0 && (
          <button className="toolbar-btn danger" onClick={clearAll}>
            <X size={14} /> Clear All
          </button>
        )}
      </div>

      {showPanel && (
        <div className="search-panel glass-panel" ref={panelRef}>
          {/* Sort */}
          {sortOptions.length > 0 && (
            <div className="panel-section">
              <div className="panel-label"><ArrowUpDown size={13} /> Sort By</div>
              <div className="panel-controls">
                <select className="form-input panel-select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
                  <option value="">None</option>
                  {sortOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                {sortKey && (
                  <button className="toggle-dir" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
                    {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter */}
          {filterOptions.length > 0 && (
            <div className="panel-section">
              <div className="panel-label"><SlidersHorizontal size={13} /> Filter</div>
              <div className="panel-controls filter-controls">
                {filterOptions.map(f => (
                  <select key={f.key} className="form-input panel-select" value={activeFilters[f.key] || ''} onChange={e => setActiveFilters(p => ({...p, [f.key]: e.target.value}))}>
                    <option value="">{f.label}: All</option>
                    {f.values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ))}
              </div>
            </div>
          )}

          {/* Group By */}
          {groupByOptions.length > 0 && (
            <div className="panel-section">
              <div className="panel-label"><Layers size={13} /> Group By</div>
              <div className="panel-controls">
                <select className="form-input panel-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                  <option value="">None</option>
                  {groupByOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
