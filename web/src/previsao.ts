import { MODELO } from "./data";
import type { Paciente, Pesagem } from "./types";

type Pt = { dia: number; p10: number; p25: number; p50: number; p75: number; p90: number };
export const curvaRef = (tipo: string): Pt[] => MODELO.curvas_referencia[tipo];

export function refEm(tipo: string, dia: number): Pt {
  const c = curvaRef(tipo);
  if (dia <= c[0].dia) return c[0];
  if (dia >= c[c.length - 1].dia) return c[c.length - 1];
  const i = c.findIndex((p) => p.dia >= dia);
  const a = c[i - 1], b = c[i], f = (dia - a.dia) / (b.dia - a.dia);
  const L = (k: keyof Pt) => a[k] + (b[k] - a[k]) * f;
  return { dia, p10: L("p10"), p25: L("p25"), p50: L("p50"), p75: L("p75"), p90: L("p90") };
}

export type Previsao = {
  twl12: number; margem: number; modelo: "pre_op" | "precoce"; tau: number;
  trajetoria: { dia: number; previsto: number }[];
};

export function preverTWL(p: Paciente, pes: Pesagem[]): Previsao {
  const twl = (d: number) => pes.find((x) => x.dia_pos === d)?.pct_twl;
  const d30 = twl(30), d90 = twl(90);
  const precoce = d30 !== undefined && d90 !== undefined;
  const m = MODELO.modelos[precoce ? "precoce" : "pre_op"];
  const x: Record<string, number> = {
    idade: p.idade, masculino: p.sexo === "M" ? 1 : 0, imc_pre: p.imc_pre, rygb: p.tipo_cirurgia === "RYGB" ? 1 : 0,
    dm2: +p.dm2, has: +p.has, compulsao_alimentar_previa: +p.compulsao_alimentar_previa,
    transtorno_humor_previo: +p.transtorno_humor_previo, tabagismo: +p.tabagismo,
    twl_d30: d30 ?? 0, twl_d90: d90 ?? 0,
  };
  let twl12 = m.intercepto;
  for (const [k, c] of Object.entries(m.coeficientes)) twl12 += (c as number) * (x[k] ?? 0);
  const tau = MODELO.tau_dias as number;
  const trajetoria = [];
  for (let t = 0; t <= 365; t += 15)
    trajetoria.push({ dia: t, previsto: +(twl12 * (1 - Math.exp(-t / tau)) / (1 - Math.exp(-365 / tau))).toFixed(1) });
  trajetoria.push({ dia: 365, previsto: +twl12.toFixed(1) });
  return { twl12: +twl12.toFixed(1), margem: m.desvio_residual, modelo: precoce ? "precoce" : "pre_op", tau, trajetoria };
}

/** Regra do modelo: %TWL observado abaixo do p10 da curva da cirurgia no mesmo dia. */
export function abaixoDoP10(p: Paciente, pes: Pesagem[]): boolean {
  const ult = [...pes].filter((x) => x.dia_pos > 30).sort((a, b) => b.dia_pos - a.dia_pos)[0];
  return !!ult && ult.pct_twl < refEm(p.tipo_cirurgia, ult.dia_pos).p10;
}
