"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";

export function EvolutionChart({ data }: { data: { day: string; avg: number; answered: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted)" }} stroke="var(--line)" />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 70, 100]} tick={{ fontSize: 11, fill: "var(--muted)" }} stroke="var(--line)" />
          <ReferenceLine y={70} stroke="var(--ok)" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => (name === "avg" ? [`${v}%`, "Dominio promedio"] : [v, "Respondidas"])}
          />
          <Line type="monotone" dataKey="avg" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
