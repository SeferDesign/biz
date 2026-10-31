'use client';

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, chartFormat } from './theme.js';

const outlineAxisId = 'outline';

// bars: [{ key, label, color, valueKey }]; outlines: [{ key, label, color }]; lines: [{ value, label, color, dashed }].
export default function ColumnChart({
  data,
  categoryKey = 'label',
  bars,
  outlines = [],
  stacked = false,
  lines = [],
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
    <figure className="chart" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} tick={tick} tickLine={false} tickMargin={10} axisLine={false} />
          {outlines.length > 0 && <XAxis dataKey={categoryKey} xAxisId={outlineAxisId} hide />}
          <YAxis tick={tick} tickFormatter={formatter.axis} tickLine={false} tickMargin={8} axisLine={false} width={72} />
          <Tooltip formatter={tooltipValue} />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.label}
              fill={bar.color}
              stackId={stacked ? 'stack' : undefined}
              stroke={stacked ? 'var(--background)' : undefined}
              radius={[4, 4, 0, 0]}
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
              strokeWidth={1}
              strokeDasharray="4 4"
              legendType="line"
              maxBarSize={maxBarSize}
              isAnimationActive={false}
            />
          ))}
          {bars.length > 1 && <Legend verticalAlign="bottom" height={28} />}
          {lines.filter((line) => line.value != null).map((line) => (
            <ReferenceLine
              key={line.label}
              y={line.value}
              stroke={line.color}
              strokeWidth={1}
              strokeDasharray={line.dashed ? '4 4' : undefined}
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
