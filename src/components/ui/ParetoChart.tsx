import * as React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

import { cn } from "@/lib/utils";

export type ParetoChartDatum = {
  name: string;
  [key: string]: any;
};

export type ParetoChartProps = {
  data: ParetoChartDatum[];
  nameKey?: string;
  barKey: string;
  barName?: string;
  barColor?: string;
  lines?: Array<{
    dataKey: string;
    name?: string;
    color?: string;
  }>;
  lineKey?: string;
  lineName?: string;
  lineColor?: string;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  yAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: any, props: any) => any;
  animationDuration?: number;
  className?: string;
  cellColor?: (entry: ParetoChartDatum, index: number) => string;
  referenceLines?: Array<{
    y: number;
    label?: string;
    stroke?: string;
  }>;
};

export function ParetoChart({
  data,
  nameKey = "name",
  barKey,
  barName,
  barColor = "hsl(var(--primary))",
  lines,
  lineKey,
  lineName,
  lineColor = "hsl(var(--muted-foreground))",
  height = 220,
  showLegend = true,
  showTooltip = true,
  yAxisFormatter,
  tooltipFormatter,
  animationDuration = 750,
  className,
  cellColor,
  referenceLines,
}: ParetoChartProps) {
  const linesToRender = lines ??
    (lineKey ? [{ dataKey: lineKey, name: lineName, color: lineColor }] : []);

  return (
    <div className={cn("h-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={yAxisFormatter}
            width={40}
          />

          {showTooltip && <Tooltip formatter={tooltipFormatter} />}
          {showLegend && <Legend />}

          <Bar
            dataKey={barKey}
            name={barName}
            fill={barColor}
            radius={[4, 4, 0, 0]}
            isAnimationActive
            animationDuration={animationDuration}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={cellColor ? cellColor(entry, index) : barColor} />
            ))}
          </Bar>

          {linesToRender.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              strokeDasharray="4 4"
              isAnimationActive
              animationDuration={animationDuration}
            />
          ))}

          {referenceLines?.map((refLine, index) => (
            <ReferenceLine
              key={`ref-${index}`}
              y={refLine.y}
              stroke={refLine.stroke || "hsl(var(--muted-foreground))"}
              strokeDasharray="5 5"
              label={{ value: refLine.label, position: "topRight", fontSize: 10 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ParetoChart;
