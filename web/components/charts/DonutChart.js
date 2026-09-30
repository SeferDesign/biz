'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { chartColors, chartFormat, chartPalette } from './theme.js';

function SliceLabel({ x, y, textAnchor, name }) {
  return <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill={chartColors.axis} fontSize={12} fontWeight={600}>{name}</text>;
}

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
    <figure className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="42%"
            outerRadius="68%"
            paddingAngle={1}
            stroke="#ffffff"
            label={SliceLabel}
          >
            {data.map((entry, index) => <Cell key={entry[nameKey]} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip formatter={formatter.value} />
        </PieChart>
      </ResponsiveContainer>
    </figure>
  );
}
