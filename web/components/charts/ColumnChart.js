'use client';

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, chartFormat, chartSeries, chartTooltipStyles } from './theme.js';

const outlineAxisId = 'outline';

function ChartSwatch({ color, outlined }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3 shrink-0"
      style={outlined ? { border: `1px dashed ${color}` } : { backgroundColor: color }}
    />
  );
}

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
  const series = chartSeries(bars, outlines);

  return (
    <figure className="chart" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} tick={tick} tickLine={false} tickMargin={10} axisLine={false} />
          {outlines.length > 0 && <XAxis dataKey={categoryKey} xAxisId={outlineAxisId} hide />}
          <YAxis tick={tick} tickFormatter={formatter.axis} tickLine={false} tickMargin={8} axisLine={false} width={72} />
          <Tooltip
            cursor={{ fill: 'var(--muted)', fillOpacity: 0.45 }}
            content={({ active, payload, label: tooltipLabel }) => active && payload?.length ? (
              <div className="p-3 text-sm shadow-sm" style={chartTooltipStyles.contentStyle}>
                <p className="mb-2 font-medium">{tooltipLabel}</p>
                <ul className="grid gap-1.5">
                  {series.map((item) => {
                    const entry = payload.find((entry) => entry.dataKey === item.key);
                    if (!entry || entry.value == null) return null;
                    const value = item.valueKey ? entry.payload[item.valueKey] : entry.value;
                    return (
                      <li key={item.key} className="flex items-center gap-2">
                        <ChartSwatch color={item.color} outlined={item.outlined} />
                        <span>{item.label}</span>
                        <span className="ml-auto pl-3 tabular-nums">{formatter.value(value)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          />
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
          {series.length > 1 && (
            <Legend
              verticalAlign="bottom"
              height={28}
              content={() => (
                <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {series.map((item) => (
                    <li key={item.key} className="flex items-center gap-1.5">
                      <ChartSwatch color={item.color} outlined={item.outlined} />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            />
          )}
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
