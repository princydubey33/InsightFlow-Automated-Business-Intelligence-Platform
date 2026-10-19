import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  RotateCcw, 
  Plus, 
  Calendar, 
  Hash, 
  Type,
  Check
} from 'lucide-react';
import type { DashboardFilter } from '../../types/dashboard';

interface FiltersPanelProps {
  filters: DashboardFilter[];
  onFilterChange: (filters: DashboardFilter[]) => void;
  columnTypes: Record<string, 'numeric' | 'categorical' | 'date'>;
  records: Record<string, any>[];
  onClearAll: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  filters,
  onFilterChange,
  columnTypes,
  records,
  onClearAll,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [addFilterMenuOpen, setAddFilterMenuOpen] = useState(false);

  // Compute distinct values and counts for each field from raw records
  const distinctFieldData = useMemo(() => {
    const data: Record<string, { value: string; count: number }[]> = {};
    const numericBounds: Record<string, { min: number; max: number }> = {};
    const dateBounds: Record<string, { min: string; max: string }> = {};

    for (const [col, type] of Object.entries(columnTypes)) {
      if (type === 'categorical') {
        const counts: Record<string, number> = {};
        for (const r of records) {
          const val = String(r[col] ?? '(blank)');
          counts[val] = (counts[val] || 0) + 1;
        }
        data[col] = Object.entries(counts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
      } else if (type === 'numeric') {
        let min = Infinity;
        let max = -Infinity;
        for (const r of records) {
          const val = parseFloat(r[col]);
          if (!isNaN(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
        if (min !== Infinity) {
          numericBounds[col] = { min: Math.floor(min), max: Math.ceil(max) };
        }
      } else if (type === 'date') {
        let min = '';
        let max = '';
        for (const r of records) {
          const val = String(r[col] ?? '');
          if (val) {
            if (!min || val < min) min = val;
            if (!max || val > max) max = val;
          }
        }
        if (min) {
          dateBounds[col] = { min, max };
        }
      }
    }
    return { data, numericBounds, dateBounds };
  }, [columnTypes, records]);

  // Toggle field collapse in the filters pane
  const toggleFieldExpand = (field: string) => {
    setExpandedFields(prev => ({
      ...prev,
      [field]: prev[field] === undefined ? false : !prev[field]
    }));
  };

  // Add a new filter field
  const handleAddFilter = (field: string) => {
    const type = columnTypes[field] || 'categorical';
    if (filters.some(f => f.field === field)) return;

    const newFilter: DashboardFilter = {
      field,
      type,
      selectedValues: [],
      numericMin: null,
      numericMax: null,
      dateFrom: null,
      dateTo: null
    };

    onFilterChange([...filters, newFilter]);
    setExpandedFields(prev => ({ ...prev, [field]: true }));
    setAddFilterMenuOpen(false);
  };

  // Remove a filter
  const handleRemoveFilter = (field: string) => {
    onFilterChange(filters.filter(f => f.field !== field));
  };

  // Update categorical selections
  const toggleCategoricalValue = (field: string, val: string) => {
    const updated = filters.map(f => {
      if (f.field !== field) return f;
      const current = f.selectedValues || [];
      const exists = current.includes(val);
      const newSelected = exists 
        ? current.filter(v => v !== val)
        : [...current, val];
      return { ...f, selectedValues: newSelected };
    });
    onFilterChange(updated);
  };

  // Select all or clear all values for a categorical filter
  const selectAllCategorical = (field: string, allValues: string[]) => {
    const updated = filters.map(f => {
      if (f.field !== field) return f;
      return { ...f, selectedValues: [] }; // Empty means all selected (unfiltered)
    });
    onFilterChange(updated);
  };

  // Update numeric bounds
  const updateNumericFilter = (field: string, min: number | null, max: number | null) => {
    const updated = filters.map(f => {
      if (f.field !== field) return f;
      return { ...f, numericMin: min, numericMax: max };
    });
    onFilterChange(updated);
  };

  // Update date bounds
  const updateDateFilter = (field: string, from: string | null, to: string | null) => {
    const updated = filters.map(f => {
      if (f.field !== field) return f;
      return { ...f, dateFrom: from, dateTo: to };
    });
    onFilterChange(updated);
  };

  // Calculate active filters count
  const activeCount = useMemo(() => {
    return filters.filter(f => {
      if (f.type === 'categorical') return f.selectedValues.length > 0;
      if (f.type === 'numeric') return f.numericMin !== null || f.numericMax !== null;
      if (f.type === 'date') return Boolean(f.dateFrom || f.dateTo);
      return false;
    }).length;
  }, [filters]);

  // Available fields to add that aren't already filtered
  const availableFields = useMemo(() => {
    return Object.keys(columnTypes).filter(col => !filters.some(f => f.field === col));
  }, [columnTypes, filters]);

  if (isCollapsed) {
    return (
      <div 
        onClick={onToggleCollapse}
        className="w-10 bg-white border-l border-gray-200 flex flex-col items-center py-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm select-none"
        title="Expand Filters Pane"
      >
        <div className="flex flex-col items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span 
            className="text-xs font-semibold text-gray-600 tracking-wider uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Filters
          </span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full shadow-sm text-gray-800 text-sm">
      {/* Pane Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Filters on this page</h3>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button
              onClick={onClearAll}
              title="Clear all active filters"
              className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-200/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200/60 transition-colors"
              title="Collapse Filters"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Add Filter Bar */}
      <div className="p-3 border-b border-gray-100 bg-white relative">
        <button
          onClick={() => setAddFilterMenuOpen(!addFilterMenuOpen)}
          className="w-full py-1.5 px-3 border border-dashed border-gray-300 hover:border-blue-400 rounded-lg text-xs font-medium text-gray-600 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors bg-gray-50/50 hover:bg-blue-50/30"
        >
          <Plus className="w-3.5 h-3.5" />
          Add filter field
        </button>

        {addFilterMenuOpen && (
          <div className="absolute top-12 left-3 right-3 bg-white border border-gray-200 shadow-xl rounded-lg z-30 max-h-56 overflow-y-auto p-1 animate-in fade-in slide-in-from-top-1">
            {availableFields.length === 0 ? (
              <div className="p-3 text-xs text-gray-400 text-center">All fields already in filters</div>
            ) : (
              availableFields.map(field => {
                const type = columnTypes[field];
                return (
                  <button
                    key={field}
                    onClick={() => handleAddFilter(field)}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-50 text-xs flex items-center gap-2 text-gray-700 hover:text-blue-700"
                  >
                    {type === 'numeric' && <Hash className="w-3.5 h-3.5 text-blue-500" />}
                    {type === 'categorical' && <Type className="w-3.5 h-3.5 text-emerald-500" />}
                    {type === 'date' && <Calendar className="w-3.5 h-3.5 text-amber-500" />}
                    <span className="truncate">{field}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Filter Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filters.length === 0 ? (
          <div className="text-center py-10 px-4 text-gray-400">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
            <p className="text-xs font-medium text-gray-600">No active filters</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Add fields from above or click slices in charts to cross-filter.
            </p>
          </div>
        ) : (
          filters.map(filter => {
            const isExpanded = expandedFields[filter.field] !== false;
            const type = filter.type;
            const values = distinctFieldData.data[filter.field] || [];
            const searchTerm = searchTerms[filter.field] || '';
            const filteredValues = values.filter(v => 
              v.value.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const hasActiveValues = filter.selectedValues.length > 0;
            const hasActiveNumeric = filter.numericMin !== null || filter.numericMax !== null;
            const hasActiveDate = Boolean(filter.dateFrom || filter.dateTo);
            const isFilterActive = hasActiveValues || hasActiveNumeric || hasActiveDate;

            return (
              <div 
                key={filter.field} 
                className={`border rounded-lg bg-white overflow-hidden transition-shadow ${
                  isFilterActive ? 'border-blue-300 ring-1 ring-blue-100 shadow-sm' : 'border-gray-200'
                }`}
              >
                {/* Filter Header */}
                <div 
                  onClick={() => toggleFieldExpand(filter.field)}
                  className="px-3 py-2 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100/70 select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {type === 'numeric' && <Hash className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    {type === 'categorical' && <Type className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                    {type === 'date' && <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    <span className="font-semibold text-xs text-gray-800 truncate" title={filter.field}>
                      {filter.field}
                    </span>
                    {isFilterActive && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFilter(filter.field);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-200/50"
                      title="Remove filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Filter Content */}
                {isExpanded && (
                  <div className="p-3 bg-white text-xs border-t border-gray-100 space-y-2.5">
                    {/* Categorical Filter */}
                    {type === 'categorical' && (
                      <>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
                          <input
                            type="text"
                            placeholder={`Search ${filter.field}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerms({ ...searchTerms, [filter.field]: e.target.value })}
                            className="w-full pl-7 pr-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500 px-0.5">
                          <span>
                            {hasActiveValues 
                              ? `${filter.selectedValues.length} selected` 
                              : 'All values included'}
                          </span>
                          {hasActiveValues && (
                            <button
                              onClick={() => selectAllCategorical(filter.field, values.map(v => v.value))}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-gray-100 rounded p-1 bg-gray-50/40">
                          {filteredValues.slice(0, 50).map(({ value, count }) => {
                            const isChecked = filter.selectedValues.includes(value);
                            return (
                              <label
                                key={value}
                                className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-white cursor-pointer select-none group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                                    isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white group-hover:border-blue-400'
                                  }`}>
                                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="truncate text-gray-700 text-xs" title={value}>
                                    {value}
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono ml-2">
                                  {count}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Numeric Range Filter */}
                    {type === 'numeric' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium block mb-1">
                              Min {distinctFieldData.numericBounds[filter.field]?.min !== undefined && `(${distinctFieldData.numericBounds[filter.field]?.min})`}
                            </label>
                            <input
                              type="number"
                              placeholder="Any"
                              value={filter.numericMin ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                updateNumericFilter(filter.field, val, filter.numericMax ?? null);
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium block mb-1">
                              Max {distinctFieldData.numericBounds[filter.field]?.max !== undefined && `(${distinctFieldData.numericBounds[filter.field]?.max})`}
                            </label>
                            <input
                              type="number"
                              placeholder="Any"
                              value={filter.numericMax ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                updateNumericFilter(filter.field, filter.numericMin ?? null, val);
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        {hasActiveNumeric && (
                          <button
                            onClick={() => updateNumericFilter(filter.field, null, null)}
                            className="text-[11px] text-blue-600 hover:underline font-medium block ml-auto"
                          >
                            Reset range
                          </button>
                        )}
                      </div>
                    )}

                    {/* Date Range Filter */}
                    {type === 'date' && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium block mb-1">Start Date</label>
                          <input
                            type="date"
                            value={filter.dateFrom ?? ''}
                            onChange={(e) => updateDateFilter(filter.field, e.target.value || null, filter.dateTo ?? null)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium block mb-1">End Date</label>
                          <input
                            type="date"
                            value={filter.dateTo ?? ''}
                            onChange={(e) => updateDateFilter(filter.field, filter.dateFrom ?? null, e.target.value || null)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        {hasActiveDate && (
                          <button
                            onClick={() => updateDateFilter(filter.field, null, null)}
                            className="text-[11px] text-blue-600 hover:underline font-medium block ml-auto"
                          >
                            Reset dates
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
