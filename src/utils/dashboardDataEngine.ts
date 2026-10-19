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
 * Safely parse a value into a valid number or null
 */
export function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === 'null') return null;
  // Clean currency symbols, commas, spaces
  const cleaned = str.replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Aggregate a list of numeric values using specified aggregation type
 * Returns null if no valid numbers were supplied
 */
export function aggregateValues(values: number[], agg: AggregationType): number | null {
  if (!values || values.length === 0) return null;
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
  kpiValue?: number | null;
  kpiLabel?: string;
  seriesKeys: string[];
} {
  if (!records || records.length === 0) {
    return { data: [], kpiValue: null, seriesKeys: [] };
  }

  const { xField, yField, groupField, aggregation, topN, type } = visual;
  const targetField = yField || xField;

  // 1. KPI Metric Card
  if (type === 'kpi') {
    let aggValue: number | null = null;

    if (aggregation === 'count') {
      if (targetField && records[0] && targetField in records[0]) {
        // Count non-empty records for this field (categorical, date, or numeric)
        const nonNullCount = records.filter(r => {
          const val = r[targetField];
          return val !== null && val !== undefined && String(val).trim() !== '';
        }).length;
        aggValue = nonNullCount;
      } else {
        // Count all rows in current filtered dataset
        aggValue = records.length;
      }
    } else {
      // Numeric aggregations: sum, avg, min, max
      const numericVals: number[] = [];
      for (const r of records) {
        if (!targetField) continue;
        const num = parseNumericValue(r[targetField]);
        if (num !== null) numericVals.push(num);
      }
      aggValue = aggregateValues(numericVals, aggregation);
    }

    const labelName = targetField || 'Records';
    return {
      data: [{ name: labelName, value: aggValue ?? 0 }],
      kpiValue: aggValue,
      kpiLabel: `${aggregation.toUpperCase()} of ${labelName}`,
      seriesKeys: ['value']
    };
  }

  // 2. Table Visual
  if (type === 'table') {
    const tableRows = records.slice(0, topN || 50).map((r, idx) => ({
      _id: idx,
      ...r
    }));
    return {
      data: tableRows,
      seriesKeys: [xField, yField, ...(groupField ? [groupField] : [])].filter(Boolean)
    };
  }

  // 3. Scatter Plot
  if (type === 'scatter') {
    const points: any[] = [];
    for (const r of records.slice(0, topN || 100)) {
      const xVal = parseNumericValue(r[xField]);
      const yVal = parseNumericValue(r[yField]);
      if (xVal !== null && yVal !== null) {
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

  // 4. Grouped Breakdown by groupField (Multi-series)
  if (groupField) {
    const nestedGroups: Record<string, Record<string, number[]>> = {};
    const allGroupKeys = new Set<string>();

    for (const r of records) {
      const xVal = String(r[xField] ?? 'Unknown');
      const gVal = String(r[groupField] ?? 'Other');

      if (!nestedGroups[xVal]) nestedGroups[xVal] = {};
      if (!nestedGroups[xVal][gVal]) nestedGroups[xVal][gVal] = [];

      if (aggregation === 'count') {
        const rawY = r[yField];
        if (rawY !== null && rawY !== undefined && String(rawY).trim() !== '') {
          nestedGroups[xVal][gVal].push(1);
        }
      } else {
        const yVal = parseNumericValue(r[yField]);
        if (yVal !== null) {
          nestedGroups[xVal][gVal].push(yVal);
        }
      }
      allGroupKeys.add(gVal);
    }

    const seriesKeys = Array.from(allGroupKeys).slice(0, 6);
    let chartData = Object.entries(nestedGroups).map(([xVal, groupObj]) => {
      const rowObj: any = { name: xVal };
      let rowTotal = 0;
      for (const gKey of seriesKeys) {
        const valArr = groupObj[gKey] || [];
        const aggVal = aggregation === 'count' 
          ? valArr.length 
          : (aggregateValues(valArr, aggregation) ?? 0);
        rowObj[gKey] = Math.round(aggVal * 100) / 100;
        rowTotal += aggVal;
      }
      rowObj._total = rowTotal;
      return rowObj;
    });

    chartData.sort((a, b) => b._total - a._total);

    if (topN && topN > 0) {
      chartData = chartData.slice(0, topN);
    }

    return {
      data: chartData,
      seriesKeys
    };
  } else {
    // 5. Single-series Breakdown by xField
    const groups: Record<string, number[]> = {};

    for (const r of records) {
      const xVal = String(r[xField] ?? 'Unknown');
      if (!groups[xVal]) groups[xVal] = [];

      if (aggregation === 'count') {
        const rawY = r[yField];
        if (!yField || (rawY !== null && rawY !== undefined && String(rawY).trim() !== '')) {
          groups[xVal].push(1);
        }
      } else {
        const yVal = parseNumericValue(r[yField]);
        if (yVal !== null) {
          groups[xVal].push(yVal);
        }
      }
    }

    let chartData = Object.entries(groups).map(([xVal, valArr]) => {
      const aggVal = aggregation === 'count' 
        ? valArr.length 
        : (aggregateValues(valArr, aggregation) ?? 0);
      return {
        name: xVal,
        value: Math.round(aggVal * 100) / 100
      };
    });

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
