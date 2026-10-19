import type { 
  VisualConfig, 
  DashboardFilter, 
  CrossFilter, 
  NumberFormatType, 
  AggregationType 
} from '../types/dashboard';

/**
 * Format any numeric value based on user formatting settings
 */
export function formatValue(
  val: number | null | undefined, 
  format: NumberFormatType = 'standard',
  currencySymbol: '$' | '₹' | '€' | '£' = '$',
  decimalPlaces: number = 2
): string {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';

  const fixed = val.toFixed(decimalPlaces);
  const num = parseFloat(fixed);

  switch (format) {
    case 'currency':
      return `${currencySymbol}${num.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      })}`;

    case 'percentage':
      return `${num.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      })}%`;

    case 'compact':
      if (Math.abs(num) >= 1_000_000_000) {
        return `${(num / 1_000_000_000).toFixed(decimalPlaces)}B`;
      }
      if (Math.abs(num) >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(decimalPlaces)}M`;
      }
      if (Math.abs(num) >= 1_000) {
        return `${(num / 1_000).toFixed(decimalPlaces)}K`;
      }
      return num.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      });

    case 'standard':
    default:
      return num.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      });
  }
}

/**
 * Apply filters (both panel filters and active cross-filters) to dataset records
 */
export function filterRecords(
  records: Record<string, any>[],
  filters: DashboardFilter[],
  crossFilter: CrossFilter | null,
  currentVisualId?: string
): Record<string, any>[] {
  if (!records || records.length === 0) return [];

  return records.filter(row => {
    // 1. Check panel filters
    for (const f of filters) {
      const val = row[f.field];
      if (val === undefined || val === null) continue;

      if (f.type === 'categorical' && f.selectedValues && f.selectedValues.length > 0) {
        if (!f.selectedValues.includes(String(val))) {
          return false;
        }
      }

      if (f.type === 'numeric') {
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
          if (f.numericMin !== null && f.numericMin !== undefined && numVal < f.numericMin) {
            return false;
          }
          if (f.numericMax !== null && f.numericMax !== undefined && numVal > f.numericMax) {
            return false;
          }
        }
      }

      if (f.type === 'date') {
        const dateStr = String(val);
        if (f.dateFrom && dateStr < f.dateFrom) return false;
        if (f.dateTo && dateStr > f.dateTo) return false;
      }
    }

    // 2. Check cross-filter (applies to other visuals, not the one being clicked)
    if (crossFilter && crossFilter.visualId !== currentVisualId) {
      const rowVal = String(row[crossFilter.field] ?? '');
      if (rowVal !== crossFilter.value) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Aggregate a list of numeric values using specified aggregation type
 */
function aggregateValues(values: number[], agg: AggregationType): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case 'sum':
      return values.reduce((acc, curr) => acc + curr, 0);
    case 'avg':
      return values.reduce((acc, curr) => acc + curr, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.reduce((acc, curr) => acc + curr, 0);
  }
}

/**
 * Process dataset records into chart data for a visual configuration
 */
export function processVisualData(
  visual: VisualConfig,
  records: Record<string, any>[]
): {
  data: any[];
  kpiValue?: number;
  kpiLabel?: string;
  seriesKeys: string[];
} {
  if (!records || records.length === 0) {
    return { data: [], seriesKeys: [] };
  }

  const { xField, yField, groupField, aggregation, topN, type } = visual;

  // KPI Card
  if (type === 'kpi') {
    const numericVals: number[] = [];
    for (const r of records) {
      const val = parseFloat(r[yField]);
      if (!isNaN(val)) numericVals.push(val);
    }
    const aggValue = aggregateValues(numericVals, aggregation);
    return {
      data: [{ name: yField || xField || 'Total', value: aggValue }],
      kpiValue: aggValue,
      kpiLabel: `${aggregation.toUpperCase()} of ${yField || 'records'}`,
      seriesKeys: ['value']
    };
  }

  // Table Visual
  if (type === 'table') {
    // Return sample rows sorted by yField if available
    const tableRows = records.slice(0, topN || 50).map((r, idx) => ({
      _id: idx,
      ...r
    }));
    return {
      data: tableRows,
      seriesKeys: [xField, yField, ...(groupField ? [groupField] : [])].filter(Boolean)
    };
  }

  // Scatter Plot
  if (type === 'scatter') {
    const points: any[] = [];
    for (const r of records.slice(0, topN || 100)) {
      const xVal = parseFloat(r[xField]);
      const yVal = parseFloat(r[yField]);
      if (!isNaN(xVal) && !isNaN(yVal)) {
        points.push({
          x: xVal,
          y: yVal,
          name: groupField ? String(r[groupField] ?? '') : `${xVal}, ${yVal}`,
          group: groupField ? String(r[groupField] ?? '') : 'Data'
        });
      }
    }
    return {
      data: points,
      seriesKeys: ['y']
    };
  }

  // Grouped / Standard Aggregation (Bar, Line, Area, Pie, Donut)
  if (groupField) {
    // Multi-series breakdown by groupField
    const nestedGroups: Record<string, Record<string, number[]>> = {};
    const allGroupKeys = new Set<string>();

    for (const r of records) {
      const xVal = String(r[xField] ?? 'Unknown');
      const gVal = String(r[groupField] ?? 'Other');
      const yVal = parseFloat(r[yField]);

      if (!nestedGroups[xVal]) nestedGroups[xVal] = {};
      if (!nestedGroups[xVal][gVal]) nestedGroups[xVal][gVal] = [];

      if (!isNaN(yVal)) {
        nestedGroups[xVal][gVal].push(yVal);
      }
      allGroupKeys.add(gVal);
    }

    const seriesKeys = Array.from(allGroupKeys).slice(0, 6); // Max 6 series for clean display
    let chartData = Object.entries(nestedGroups).map(([xVal, groupObj]) => {
      const rowObj: any = { name: xVal };
      let rowTotal = 0;
      for (const gKey of seriesKeys) {
        const valArr = groupObj[gKey] || [];
        const aggVal = aggregateValues(valArr, aggregation);
        rowObj[gKey] = Math.round(aggVal * 100) / 100;
        rowTotal += aggVal;
      }
      rowObj._total = rowTotal;
      return rowObj;
    });

    // Sort descending by total
    chartData.sort((a, b) => b._total - a._total);

    if (topN && topN > 0) {
      chartData = chartData.slice(0, topN);
    }

    return {
      data: chartData,
      seriesKeys
    };
  } else {
    // Single-series breakdown by xField
    const groups: Record<string, number[]> = {};

    for (const r of records) {
      const xVal = String(r[xField] ?? 'Unknown');
      const yVal = parseFloat(r[yField]);

      if (!groups[xVal]) groups[xVal] = [];
      if (!isNaN(yVal)) {
        groups[xVal].push(yVal);
      } else if (aggregation === 'count') {
        groups[xVal].push(1);
      }
    }

    let chartData = Object.entries(groups).map(([xVal, valArr]) => {
      const aggVal = aggregateValues(valArr, aggregation);
      return {
        name: xVal,
        value: Math.round(aggVal * 100) / 100
      };
    });

    // Sort descending
    chartData.sort((a, b) => b.value - a.value);

    if (topN && topN > 0) {
      chartData = chartData.slice(0, topN);
    }

    return {
      data: chartData,
      seriesKeys: ['value']
    };
  }
}
