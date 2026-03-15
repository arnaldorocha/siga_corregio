import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Maximize2 } from "lucide-react";
import ParetoChart from "@/components/ui/ParetoChart";

interface ChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  chartData: any[];
  chartConfig: {
    barKey: string;
    barName: string;
    yAxisFormatter?: (value: number) => string;
    tooltipFormatter?: (value: number, name: string, props: any) => [string, string];
    cellColor?: (entry: any) => string;
    lines?: Array<{
      dataKey: string;
      name: string;
      color: string;
    }>;
    referenceLines?: Array<{
      y: number;
      label: string;
      stroke: string;
    }>;
    lineKey?: string;
    lineName?: string;
  };
}

export const ChartModal: React.FC<ChartModalProps> = ({
  open,
  onOpenChange,
  title,
  chartData,
  chartConfig,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] p-0 mx-4">
        <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl font-semibold pr-8">{title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 p-4 sm:p-6 pt-2 sm:pt-4 overflow-hidden">
          <div className="h-full bg-card rounded-lg border p-3 sm:p-6">
            <ParetoChart
              data={chartData}
              height={400}
              showLegend={true}
              animationDuration={1000}
              className="w-full"
              {...chartConfig}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};