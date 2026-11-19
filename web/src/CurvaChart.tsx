import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { refEm, type Previsao } from "./previsao";
import type { Paciente, Pesagem } from "./types";
import { Cor } from "./ui";

/** Curva do paciente sobre a faixa p10–p90 da cirurgia + trajetória prevista. */
export function CurvaChart({ p, pes, prev, height = 320 }: { p: Paciente; pes: Pesagem[]; prev: Previsao; height?: number }) {
  const dias = new Set<number>();
  for (let d = 0; d <= 365; d += 15) dias.add(d);
  pes.filter((x) => x.dia_pos >= 0).forEach((x) => dias.add(x.dia_pos));
  const data = [...dias].sort((a, b) => a - b).map((dia) => {
    const r = refEm(p.tipo_cirurgia, dia);
    const real = pes.find((x) => x.dia_pos === dia)?.pct_twl;
    const previsto = prev.trajetoria.find((t) => t.dia === dia)?.previsto;
    return { dia, base: r.p10, faixa: +(r.p90 - r.p10).toFixed(1), p50: r.p50, real, previsto };
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="dia" type="number" domain={[0, 365]} ticks={[0, 30, 90, 180, 270, 365]} label={{ value: "dias após a cirurgia", position: "insideBottom", offset: -2, fontSize: 12 }} />
        <YAxis unit="%" domain={[0, 45]} />
        <Tooltip formatter={(v) => (typeof v === "number" ? `${v.toFixed(1)}%` : v)} labelFormatter={(d) => `Dia ${d}`} />
        <Legend />
        <Area dataKey="base" stackId="f" stroke="none" fill="none" legendType="none" isAnimationActive={false} />
        <Area name="Faixa p10–p90" dataKey="faixa" stackId="f" stroke="none" fill={Cor.faixa} fillOpacity={0.3} isAnimationActive={false} />
        <Line name="Mediana (p50)" dataKey="p50" stroke="#64748b" strokeDasharray="2 4" dot={false} isAnimationActive={false} />
        <Line name="Previsto" dataKey="previsto" stroke={Cor.prev} strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        <Line name="Paciente (%TWL)" dataKey="real" stroke={Cor.paciente} strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
