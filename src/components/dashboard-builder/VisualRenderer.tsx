import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, Bar, 
  LineChart, Line, 
  AreaChart, Area, 
  PieChart, Pie, Cell, 
  ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import type { VisualConfig, DashboardTheme, CrossFilter } from '../../types/dashboard';
import { formatValue } from '../../utils/dashboardDataEngine';
import { TrendingUp, Hash, DollarSign, Layers } from 'lucide-react';

interface VisualRendererProps {
  visual: VisualConfig;
  theme: DashboardTheme;
  processedData: {
    data: any[];
    kpiValue?: number | null;
    kpiLabel?: string;
    seriesKeys: string[];
  };
  activeCrossFilter: CrossFilter | null;
  onCrossFilter?: (field: string, value: string) => void;
  isInteractive?: boolean;
  isPrinting?: boolean;
}

export const VisualRenderer: React.FC<VisualRendererProps> = ({
  visual,
  theme,
  processedData,
  activeCrossFilter,
  onCrossFilter,
  isInteractive = true,
  isPrinting = false
}) => {
  const { formatting, type, xField } = visual;
  const { data, kpiValue, kpiLabel, seriesKeys } = processedData;

  const colors = formatting.seriesColors && formatting.seriesColors.length > 0 
    ? formatting.seriesColors 
    : theme.palette;

  const axisStroke = formatting.axisColor || theme.subtextColor;
  const gridStroke = formatting.gridColor || theme.gridColor;
  const chartHeight = visual.height || 260;

  // Custom Recharts Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!formatting.showTooltip || !active || !payload || !payload.length || isPrinting) return null;

    return (
      <div 
        className="p-3 shadow-xl rounded-xl border text-xs"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          color: theme.textColor
        }}
      >
        <p className="font-semibold mb-1" style={{ color: theme.textColor }}>
          {label ?? payload[0]?.payload?.name}
        </p>
        {payload.map((entry: any, index: number) => {
          const formattedVal = formatValue(
            entry.value,
            formatting.numberFormat,
            formatting.currencySymbol,
            formatting.decimalPlaces
          );
          return (
            <div key={`tip-${index}`} className="flex items-center gap-2 my-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="capitalize" style={{ color: theme.subtextColor }}>{entry.name}:</span>
              <span className="font-bold">{formattedVal}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const handleBarClick = (entry: any) => {
    if (!isInteractive || !onCrossFilter || isPrinting) return;
    const clickedVal = entry?.name || entry?.activeLabel;
    if (clickedVal && xField) {
      onCrossFilter(xField, String(clickedVal));
    }
  };

  // 1. KPI Metric Card
  if (type === 'kpi') {
    const isError = kpiValue === null || kpiValue === undefined || isNaN(kpiValue);
    const formattedKpi = isError 
      ? 'N/A' 
      : formatValue(
          kpiValue,
          formatting.numberFormat,
          formatting.currencySymbol,
          formatting.decimalPlaces
        );

    return (
      <div className="flex flex-col items-center justify-center min-h-[180px] h-full text-center p-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-inner print:border print:border-gray-200"
          style={{ backgroundColor: `${colors[0]}15`, color: colors[0] }}
        >
          {formatting.numberFormat === 'currency' ? (
            <DollarSign className="w-6 h-6" />
          ) : (
            <TrendingUp className="w-6 h-6" />
          )}
        </div>
        <div 
          className="text-3xl sm:text-4xl font-extrabold tracking-tight"
          style={{ color: isError ? '#d97706' : (colors[0] || theme.textColor) }}
        >
          {formattedKpi}
        </div>
        <div 
          className="text-xs font-semibold uppercase tracking-wider mt-1.5"
          style={{ color: theme.subtextColor }}
        >
          {kpiLabel || visual.title}
        </div>
        {isError && (
          <div className="text-[10px] text-amber-600 mt-1">
            No valid data in selected field
          </div>
        )}
      </div>
    );
  }

  // 2. Table / Matrix Visual
  if (type === 'table') {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full min-h-[180px] text-xs" style={{ color: theme.subtextColor }}>
          No records matching current filters
        </div>
      );
    }

    const columns = Object.keys(data[0]).filter(k => k !== '_id' && k !== '_total');

    return (
      <div className="overflow-x-auto h-full max-h-72 print:max-h-none print:overflow-visible custom-scrollbar text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ borderBottom: `2px solid ${theme.cardBorder}` }}>
              {columns.map(col => (
                <th 
                  key={col} 
                  className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] bg-slate-50/50 print:bg-gray-100"
                  style={{ color: theme.subtextColor }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, isPrinting ? 50 : 30).map((row, idx) => {
              const isSelected = activeCrossFilter && String(row[activeCrossFilter.field]) === activeCrossFilter.value;
              return (
                <tr 
                  key={row._id ?? idx}
                  onClick={() => {
                    if (isInteractive && onCrossFilter && xField && row[xField]) {
                      onCrossFilter(xField, String(row[xField]));
                    }
                  }}
                  className={`transition-colors border-b ${isInteractive ? 'cursor-pointer' : ''} ${isSelected ? 'font-bold' : ''}`}
                  style={{ 
                    borderColor: `${theme.cardBorder}40`,
                    backgroundColor: isSelected ? `${colors[0]}20` : (idx % 2 === 0 ? 'transparent' : `${theme.gridColor}30`),
                    color: theme.textColor
                  }}
                >
                  {columns.map(col => {
                    const cellVal = row[col];
                    const isNum = typeof cellVal === 'number';
                    const displayVal = isNum 
                      ? formatValue(cellVal, formatting.numberFormat, formatting.currencySymbol, formatting.decimalPlaces)
                      : String(cellVal ?? '');

                    return (
                      <td key={col} className="py-2 px-3 whitespace-nowrap">
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[180px] h-full text-xs text-center p-6" style={{ color: theme.subtextColor }}>
        <Layers className="w-8 h-8 opacity-40 mb-2" />
        <p className="font-medium">No data available for this visualization.</p>
        <p className="text-[10px] mt-1 opacity-70">Verify selected fields or adjust filters.</p>
      </div>
    );
  }

  // 3. Horizontal Bar Chart
  if (type === 'horizontal_bar') {
    return (
      <ResponsiveContainer width="100%" height={chartHeight} minHeight={220}>
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 10, right: 25, left: 25, bottom: 10 }}
          onClick={handleBarClick}
        >
          {formatting.showGrid && <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />}
          {formatting.showYAxis && (
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              width={80}
            />
          )}
          {formatting.showXAxis && (
            <XAxis 
              type="number" 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              tickFormatter={(v) => formatValue(v, formatting.numberFormat, formatting.currencySymbol, 0)}
            />
          )}
          {formatting.showTooltip && <Tooltip content={renderCustomTooltip} />}
          {formatting.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: theme.textColor }} />}
          {seriesKeys.map((sKey, sIdx) => (
            <Bar 
              key={sKey} 
              dataKey={sKey} 
              fill={colors[sIdx % colors.length]} 
              radius={[0, 6, 6, 0]}
              cursor="pointer"
              isAnimationActive={false}
            >
              {data.map((entry, idx) => {
                const isSelected = activeCrossFilter && entry.name === activeCrossFilter.value;
                return (
                  <Cell 
                    key={`cell-${idx}`} 
                    fill={isSelected ? '#f59e0b' : colors[sIdx % colors.length]} 
                    opacity={activeCrossFilter && !isSelected ? 0.45 : 1}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 4. Vertical Bar Chart
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={chartHeight} minHeight={220}>
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 15, left: 10, bottom: 20 }}
          onClick={handleBarClick}
        >
          {formatting.showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />}
          {formatting.showXAxis && (
            <XAxis 
              dataKey="name" 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              interval={0}
              angle={data.length > 5 ? -25 : 0}
              textAnchor={data.length > 5 ? 'end' : 'middle'}
            />
          )}
          {formatting.showYAxis && (
            <YAxis 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              tickFormatter={(v) => formatValue(v, formatting.numberFormat, formatting.currencySymbol, 0)}
            />
          )}
          {formatting.showTooltip && <Tooltip content={renderCustomTooltip} />}
          {formatting.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: theme.textColor }} />}
          {seriesKeys.map((sKey, sIdx) => (
            <Bar 
              key={sKey} 
              dataKey={sKey} 
              fill={colors[sIdx % colors.length]} 
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              isAnimationActive={false}
            >
              {data.map((entry, idx) => {
                const isSelected = activeCrossFilter && entry.name === activeCrossFilter.value;
                return (
                  <Cell 
                    key={`cell-${idx}`} 
                    fill={isSelected ? '#f59e0b' : colors[sIdx % colors.length]} 
                    opacity={activeCrossFilter && !isSelected ? 0.45 : 1}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 5. Line Chart
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={chartHeight} minHeight={220}>
        <LineChart 
          data={data} 
          margin={{ top: 10, right: 15, left: 10, bottom: 20 }}
          onClick={handleBarClick}
        >
          {formatting.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />}
          {formatting.showXAxis && (
            <XAxis 
              dataKey="name" 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              angle={data.length > 5 ? -25 : 0}
              textAnchor={data.length > 5 ? 'end' : 'middle'}
            />
          )}
          {formatting.showYAxis && (
            <YAxis 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              tickFormatter={(v) => formatValue(v, formatting.numberFormat, formatting.currencySymbol, 0)}
            />
          )}
          {formatting.showTooltip && <Tooltip content={renderCustomTooltip} />}
          {formatting.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: theme.textColor }} />}
          {seriesKeys.map((sKey, sIdx) => (
            <Line 
              key={sKey} 
              type="monotone" 
              dataKey={sKey} 
              stroke={colors[sIdx % colors.length]} 
              strokeWidth={3}
              dot={{ r: 4, fill: colors[sIdx % colors.length] }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // 6. Area Chart
  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={chartHeight} minHeight={220}>
        <AreaChart 
          data={data} 
          margin={{ top: 10, right: 15, left: 10, bottom: 20 }}
          onClick={handleBarClick}
        >
          <defs>
            {seriesKeys.map((sKey, sIdx) => (
              <linearGradient key={`grad-${sKey}`} id={`grad-${visual.id}-${sIdx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[sIdx % colors.length]} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={colors[sIdx % colors.length]} stopOpacity={0.05}/>
              </linearGradient>
            ))}
          </defs>
          {formatting.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />}
          {formatting.showXAxis && (
            <XAxis 
              dataKey="name" 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              angle={data.length > 5 ? -25 : 0}
              textAnchor={data.length > 5 ? 'end' : 'middle'}
            />
          )}
          {formatting.showYAxis && (
            <YAxis 
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              tickFormatter={(v) => formatValue(v, formatting.numberFormat, formatting.currencySymbol, 0)}
            />
          )}
          {formatting.showTooltip && <Tooltip content={renderCustomTooltip} />}
          {formatting.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: theme.textColor }} />}
          {seriesKeys.map((sKey, sIdx) => (
            <Area 
              key={sKey} 
              type="monotone" 
              dataKey={sKey} 
              stroke={colors[sIdx % colors.length]} 
              fillOpacity={1}
              fill={`url(#grad-${visual.id}-${sIdx})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // 7. Pie & Donut Charts
  if (type === 'pie' || type === 'donut') {
    const isDonut = type === 'donut';
    const innerRadius = isDonut ? 55 : 0;
    const outerRadius = 85;

    return (
      <ResponsiveContainer width="100%" height={chartHeight} minHeight={220}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          {formatting.showTooltip && <Tooltip content={renderCustomTooltip} />}
          {formatting.showLegend && <Legend wrapperStyle={{ fontSize: 11, color: theme.textColor }} />}
          <Pie 
            data={data} 
            dataKey="value" 
            nameKey="name" 
            cx="50%" 
            cy="50%" 
            innerRadius={innerRadius}
            outerRadius={outerRadius} 
            paddingAngle={isDonut ? 3 : 1}
            onClick={(entry) => handleBarClick(entry)}
            cursor="pointer"
            isAnimationActive={false}
          >
            {data.map((entry, index) => {
              const isSelected = activeCrossFilter && entry.name === activeCrossFilter.value;
              return (
                <Cell 
                  key={`slice-${index}`} 
                  fill={colors[index % colors.length]} 
                  stroke={isSelected ? '#f59e0b' : theme.cardBg}
                  strokeWidth={isSelected ? 3 : 1}
                  opacity={activeCrossFilter && !isSelected ? 0.45 : 1}
                />
              );
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // 8. Scatter Plot
  if (type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={chartHeight} minHeight={220}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          {formatting.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />}
          {formatting.showXAxis && (
            <XAxis 
              type="number" 
              dataKey="x" 
              name={visual.xField}
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
            />
          )}
          {formatting.showYAxis && (
            <YAxis 
              type="number" 
              dataKey="y" 
              name={visual.yField}
              tick={{ fill: axisStroke, fontSize: 11 }} 
              stroke={axisStroke}
              tickFormatter={(v) => formatValue(v, formatting.numberFormat, formatting.currencySymbol, 0)}
            />
          )}
          {formatting.showTooltip && <Tooltip content={renderCustomTooltip} cursor={{ strokeDasharray: '3 3' }} />}
          <Scatter name="Values" data={data} fill={colors[0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell 
                key={`dot-${index}`} 
                fill={colors[index % colors.length]} 
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  return null;
};
export default VisualRenderer;
