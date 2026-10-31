'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { chartColors, chartFormat, chartPalette } from './theme.js';

// data: [{ [nameKey], [valueKey] }]; slices take colors from `colors` in order.
export default function DonutChart({
  data,
  nameKey = 'name',
  valueKey = 'value',
  colors = chartPalette,
  format = 'number',
  height = 320,
  label
}) {
  const formatter = chartFormat(format);

  return (
    <figure className="chart" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart accessibilityLayer>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="48%"
            outerRadius="72%"
            paddingAngle={1}
            stroke="var(--background)"
            isAnimationActive={false}
          >
            {data.map((entry, index) => <Cell key={entry[nameKey]} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={formatter.value} />
          <Legend verticalAlign="bottom" height={56} />
        </PieChart>
      </ResponsiveContainer>
    </figure>
  );
}
