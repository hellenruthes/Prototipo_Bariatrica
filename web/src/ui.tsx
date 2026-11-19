import type { ReactNode } from "react";
import type { StatusAlerta } from "./types";

export const Card = ({ title, children, right, className = "" }: { title?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
    {(title || right) && <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{title}</h3>{right}</div>}
    {children}
  </section>
);

export const Kpi = ({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
    {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
  </div>
);

const SEV = { alta: "bg-red-100 text-red-800", media: "bg-amber-100 text-amber-800", baixa: "bg-slate-100 text-slate-700" } as const;
export const Sev = ({ s }: { s: keyof typeof SEV }) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV[s]}`}>{s}</span>;

const ST: Record<StatusAlerta, string> = { pendente: "bg-red-50 text-red-700 ring-red-200", em_analise: "bg-amber-50 text-amber-700 ring-amber-200", resolvido: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
export const StatusTag = ({ s }: { s: StatusAlerta }) => <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${ST[s]}`}>{s.replace("_", " ")}</span>;

export const Btn = ({ children, onClick, kind = "primary", disabled }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost"; disabled?: boolean }) => (
  <button disabled={disabled} onClick={onClick} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${kind === "primary" ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>
);

export const Cor = { rygb: "#0f766e", sleeve: "#c2410c", faixa: "#94a3b8", paciente: "#1d4ed8", prev: "#7c3aed" };
export const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
