import { formatCurrency } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const CHART_BLUE = "#3d5a78";
export const CHART_BLUE_SOFT = "#6f8fae";
export const CHART_MUTED = "#94a3b8";
export const CHART_GRID = "#e8ecf0";
export const CHART_CURSOR = "#eef2f6";

export const PIE_PALETTE = [
  "#3d5a78",
  "#6f8fae",
  "#059669",
  "#d97706",
  "#0ea5e9",
  "#6366f1",
  "#b42318",
  "#71717a",
  "#0891b2",
  "#15803d",
];

export type NamedValue = {
  name: string;
  value: number;
  color?: string;
};

type MoneyTooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; payload?: NamedValue }>;
  label?: string;
};

function MoneyTooltip({ active, payload, label }: MoneyTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const title = label ?? row.payload?.name ?? row.name ?? "";
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-sm">
      {title ? <p className="text-muted-foreground mb-0.5">{title}</p> : null}
      <p className="font-medium tabular-nums">{formatCurrency(Number(row.value ?? 0))}</p>
    </div>
  );
}

function CountTooltip({ active, payload, label }: MoneyTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const title = label ?? row.payload?.name ?? row.name ?? "";
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-sm">
      {title ? <p className="text-muted-foreground mb-0.5">{title}</p> : null}
      <p className="font-medium tabular-nums">{Number(row.value ?? 0)}</p>
    </div>
  );
}

type ColumnBarProps = {
  data: Array<{ label: string; value: number }>;
  /** Formata eixo Y e tooltip como moeda. */
  money?: boolean;
  fill?: string;
  /** Intervalo dos ticks do eixo X (útil em séries longas). */
  xInterval?: number | "preserveStartEnd";
};

/** Barras verticais no estilo “Faturamento da semana”. */
export function ColumnBarChart({
  data,
  money = false,
  fill = CHART_BLUE,
  xInterval = 0,
}: ColumnBarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          interval={xInterval}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          width={money ? 52 : 28}
          axisLine={false}
          tickLine={false}
          allowDecimals={!money}
          tickFormatter={money ? (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`) : undefined}
        />
        <Tooltip content={money ? <MoneyTooltip /> : <CountTooltip />} cursor={{ fill: CHART_CURSOR }} />
        <Bar dataKey="value" fill={fill} radius={[2, 2, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type PieProps = {
  data: NamedValue[];
  money?: boolean;
};

/** Pizza com legenda compacta ao lado (desktop) / abaixo (mobile). */
export function DonutChart({ data, money = false }: PieProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colored = data.map((d, i) => ({
    ...d,
    color: d.color ?? PIE_PALETTE[i % PIE_PALETTE.length],
  }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-h-0 flex-1 basis-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={colored}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {colored.map(s => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={money ? <MoneyTooltip /> : <CountTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex max-h-full shrink-0 flex-col gap-1.5 overflow-auto sm:w-[42%] sm:max-w-48">
        {colored.map(s => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.name} className="flex items-start gap-2 text-xs">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-[1px]"
                style={{ background: s.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{s.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {money ? formatCurrency(s.value) : s.value}
                  {total > 0 ? ` · ${pct}%` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
