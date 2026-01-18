'use client';

import * as React from 'react';
import { Pie, PieChart, Cell } from 'recharts';

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Payment } from '@/lib/types';

interface PaymentsChartProps {
  data: Payment[];
}

const chartConfig = {
  paid: {
    label: 'Paid',
    color: 'hsl(var(--chart-1))',
  },
  pending: {
    label: 'Pending',
    color: 'hsl(var(--chart-2))',
  },
  overdue: {
    label: 'Overdue',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function PaymentsChart({ data }: PaymentsChartProps) {
  const chartData = React.useMemo(() => {
    const statusCounts = data.reduce(
      (acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      },
      {} as Record<Payment['status'], number>
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      fill: `var(--color-${status})`,
    }));
  }, [data]);

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-[250px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="status"
          innerRadius={60}
          strokeWidth={5}
        >
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="status" />}
          className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}
