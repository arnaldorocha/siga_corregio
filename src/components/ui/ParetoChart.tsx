import * as React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";

export type ParetoChartDatum = {
  name: string;
  [key: string]: any;
};

export type ParetoChartLine = {
  dataKey: string;
  name?: string;
  color?: string;
  dash?: string;
  yAxisId?: "left" | "right";
  dot?: boolean | object;
};

export type ParetoChartTheme =
  | "primary"
  | "secondary"
  | "success"
  | "destructive"
  | "warning"
  | "muted"
  | "muted-foreground";

export type ParetoChartReferenceLine = {
  y: number;
  label?: string;
  stroke?: string;
  yAxisId?: "left" | "right";
  strokeDasharray?: string;
};

export type ParetoChartProps = {
  data: ParetoChartDatum[];
  nameKey?: string;
  barKey: string;
  barName?: string;
  barColor?: string;
  barRadius?: number[];
  barTheme?: ParetoChartTheme;
  lines?: ParetoChartLine[];
  lineKey?: string; // legacy single-line support
  lineName?: string;
  lineColor?: string;
  lineTheme?: ParetoChartTheme;
  lineDash?: string;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  yAxisFormatter?: (value: any) => string;
  lineYAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: any, props: any) => any;
  animationDuration?: number;
  secondaryYAxis?: boolean | "auto";
  className?: string;
  cellColor?: (entry: ParetoChartDatum, index: number) => string;
  referenceLines?: ParetoChartReferenceLine[];
};

const themeColorMap: Record<ParetoChartTheme, string> = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  success: "hsl(var(--success))",
  destructive: "hsl(var(--destructive))",
  warning: "hsl(var(--warning))",
  muted: "hsl(var(--muted))",
  "muted-foreground": "hsl(var(--muted-foreground))",
};

export function ParetoChart({
  data,
  nameKey = "name",
  barKey,
  barName,
  barColor,
  barRadius = [4, 4, 0, 0],
  barTheme = "primary",
  lines,
  lineKey,
  lineName,
  lineColor,
  lineTheme = "muted-foreground",
  lineDash = "4 4",
  height = 220,
  showLegend = true,
  showTooltip = true,
  yAxisFormatter,
  lineYAxisFormatter,
  tooltipFormatter,
  animationDuration = 750,
  secondaryYAxis = "auto",
  className,
  cellColor,
  referenceLines,
}: ParetoChartProps) {
  const lineYAxisId = "right";
  const barYAxisId = "left";

  const resolvedBarColor = barColor ?? themeColorMap[barTheme];
  const resolvedLineColor = lineColor ?? themeColorMap[lineTheme];

  const linesToRender: ParetoChartLine[] =
    lines ??
    (lineKey
      ? [
          {
            dataKey: lineKey,
            name: lineName,
            color: resolvedLineColor,
            dash: lineDash,
            yAxisId: lineYAxisId,
          },
        ]
      : []);

  // Auto decide if we need a secondary axis based on range difference
  const shouldUseSecondaryYAxis =
    secondaryYAxis === "auto"
      ? (() => {
          if (!linesToRender.length || !data.length) return false;
          const maxBar = Math.max(...data.map((d) => Number(d[barKey] ?? 0)));
          const maxLine = Math.max(
            ...linesToRender.map((line) => Math.max(...data.map((d) => Number(d[line.dataKey] ?? 0)))),
          );
          if (!maxBar || !maxLine) return false;
          const ratio = Math.max(maxBar / maxLine, maxLine / maxBar);
          return ratio > 8;
        })()
      : secondaryYAxis === true;

  return (
    <div className={cn("h-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId={barYAxisId}
            tick={{ fontSize: 12 }}
            tickFormatter={yAxisFormatter}
            width={40}
          />
          {shouldUseSecondaryYAxis && (
            <YAxis
              yAxisId={lineYAxisId}
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={lineYAxisFormatter}
              width={40}
            />
          )}

          {showTooltip && <Tooltip formatter={tooltipFormatter} />}
          {showLegend && <Legend />}

          <Bar
            yAxisId={barYAxisId}
            dataKey={barKey}
            name={barName}
            fill={resolvedBarColor}
            radius={barRadius}
            isAnimationActive
            animationDuration={animationDuration}
          >
            {cellColor &&
              data.map((entry, index) => (
                <Cell key={String(entry[nameKey]) ?? index} fill={cellColor(entry, index)} />
              ))}
          </Bar>

          {referenceLines?.map((ref) => (
            <ReferenceLine
              key={`${ref.y}-${ref.label ?? ""}`}
              y={ref.y}
              label={ref.label}
              stroke={ref.stroke ?? "hsl(var(--muted-foreground))"}
              strokeDasharray={ref.strokeDasharray ?? "4 4"}
              yAxisId={ref.yAxisId ?? (shouldUseSecondaryYAxis ? lineYAxisId : barYAxisId)}
            />
          ))}

          {linesToRender.map((line) => (
            <Line
              key={line.dataKey}
              yAxisId={line.yAxisId ?? (shouldUseSecondaryYAxis ? lineYAxisId : barYAxisId)}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color ?? resolvedLineColor}
              strokeWidth={2}
              dot={line.dot ?? { r: 3 }}
              strokeDasharray={line.dash}
              isAnimationActive
              animationDuration={animationDuration}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ParetoChart;
