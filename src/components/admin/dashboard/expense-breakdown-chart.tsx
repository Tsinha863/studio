'use client';

import * as React from 'react';
import { Pie, PieChart } from 'recharts';

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Expense, ExpenseCategory } from '@/lib/types';

interface ExpenseBreakdownChartProps {
  data: Expense[];
}

const chartConfig = {
  rent: { label: 'Rent', color: 'hsl(var(--chart-1))' },
  utilities: { label: 'Utilities', color: 'hsl(var(--chart-2))' },
  supplies: { label: 'Supplies', color: 'hsl(var(--chart-3))' },
  salaries: { label: 'Salaries', color: 'hsl(var(--chart-4))' },
  other: { label: 'Other', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  const chartData = React.useMemo(() => {
    const categoryTotals = data.reduce(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      },
      {} as Record<ExpenseCategory, number>
    );

    return Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      total,
      fill: `var(--color-${category})`,
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
          dataKey="total"
          nameKey="category"
          innerRadius={60}
          strokeWidth={5}
        >
          {chartData.map((entry) => (
            <PieChart.defaultProps.children.type key={entry.category} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="category" />}
          className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}
