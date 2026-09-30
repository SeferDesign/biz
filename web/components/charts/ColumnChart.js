'use client';

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, chartFormat } from './theme.js';

const outlineAxisId = 'outline';

/**
 * bars: [{ key, label, color, valueKey }] drawn as columns (stacked when `stacked`); tooltips show `valueKey` when set.
 * outlines: [{ key, label, color }] drawn as dashed targets over each column; null values are skipped.
 * lines: [{ value, label, color, dashed }] drawn as horizontal reference lines; null values are skipped.
 */
export default function ColumnChart({
  data,
  categoryKey = 'label',
  bars,
  outlines = [],
  lines = [],
  stacked = false,
  format = 'number',
  height = 320,
  maxBarSize = 96,
  label
}) {
  const formatter = chartFormat(format);
  const tick = { fill: chartColors.axis, fontSize: 12 };
  const valueKeys = new Map(bars.filter((bar) => bar.valueKey).map((bar) => [bar.key, bar.valueKey]));
  const tooltipValue = (value, name, item) => formatter.value(valueKeys.has(item?.dataKey) ? item.payload[valueKeys.get(item.dataKey)] : value);

  return (
    <figure className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis dataKey={categoryKey} tick={tick} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
          {outlines.length > 0 && <XAxis dataKey={categoryKey} xAxisId={outlineAxisId} hide />}
          <YAxis tick={tick} tickFormatter={formatter.axis} tickLine={false} axisLine={false} width={76} />
          <Tooltip formatter={tooltipValue} cursor={{ fill: 'rgb(28 43 39 / 4%)' }} />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.label}
              fill={bar.color}
              stackId={stacked ? 'stack' : undefined}
              stroke={stacked ? '#ffffff' : undefined}
              maxBarSize={maxBarSize}
              isAnimationActive={false}
            />
          ))}
          {outlines.map((outline) => (
            <Bar
              key={outline.key}
              dataKey={outline.key}
              name={outline.label}
              xAxisId={outlineAxisId}
              fill="none"
              stroke={outline.color}
              strokeWidth={2}
              strokeDasharray="6 4"
              maxBarSize={maxBarSize}
              isAnimationActive={false}
            />
          ))}
          {lines.filter((line) => line.value != null).map((line) => (
            <ReferenceLine
              key={line.label}
              y={line.value}
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={line.dashed ? '6 4' : undefined}
              ifOverflow="extendDomain"
              label={{
                value: `${line.label} ${formatter.axis(line.value)}`,
                position: 'insideBottomLeft',
                fill: chartColors.axis,
                fontSize: 10,
                fontWeight: 700
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
