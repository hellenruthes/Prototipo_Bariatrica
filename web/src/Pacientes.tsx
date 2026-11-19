import { useMemo, useState } from "react";
import { BASE, pesagensPorPac } from "./data";
import { abaixoDoP10 } from "./previsao";
import { useStore } from "./store";
import { Card } from "./ui";
import { filtrarAlertas } from "./permissoes";

export function Pacientes({ abrir }: { abrir: (id: string) => void }) {
  const { sessao, alertas } = useStore();
  const [q, setQ] = useState(""); const [cir, setCir] = useState(""); const [st, setSt] = useState(""); const [so, setSo] = useState(false);
  const meus = useMemo(() => filtrarAlertas(sessao!.papel, alertas).filter((a) => a.status !== "resolvido"), [alertas, sessao]);
  const cont = useMemo(() => { const m = new Map<string, number>(); meus.forEach((a) => m.set(a.paciente_id, (m.get(a.paciente_id) ?? 0) + 1)); return m; }, [meus]);
  const linhas = BASE.pacientes
    .filter((p) => (!q || p.paciente_id.toLowerCase().includes(q.toLowerCase())) && (!cir || p.tipo_cirurgia === cir) && (!st || p.status === st) && (!so || cont.has(p.paciente_id)))
    .sort((a, b) => (cont.get(b.paciente_id) ?? 0) - (cont.get(a.paciente_id) ?? 0)).slice(0, 100);
  const sel = "rounded-lg border border-slate-300 bg-white p-1.5 text-sm";
  return (
    <Card title="Pacientes" right={<span className="text-xs text-slate-500">mostrando {linhas.length} (máx. 100) · sem nome: só o código</span>}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className={sel} placeholder="Buscar código (P0042)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={sel} value={cir} onChange={(e) => setCir(e.target.value)}><option value="">Cirurgia: todas</option><option>RYGB</option><option>Sleeve</option></select>
        <select className={sel} value={st} onChange={(e) => setSt(e.target.value)}><option value="">Status: todos</option><option value="em_acompanhamento">Em acompanhamento</option><option value="concluido_12m">Concluído 12m</option></select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={so} onChange={(e) => setSo(e.target.checked)} /> só com alertas abertos meus</label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Código</th><th>Sexo/idade</th><th>Cirurgia</th><th>Dia pós</th><th>Status</th><th>%TWL atual</th><th>Alertas abertos</th></tr></thead>
          <tbody>
            {linhas.map((p) => {
              const pes = pesagensPorPac.get(p.paciente_id) ?? [];
              const ult = [...pes].sort((a, b) => b.dia_pos - a.dia_pos)[0];
              const baixo = abaixoDoP10(p, pes);
              return (
                <tr key={p.paciente_id} onClick={() => abrir(p.paciente_id)} className="cursor-pointer border-t border-slate-100 hover:bg-teal-50">
                  <td className="p-2 font-medium text-teal-800">{p.paciente_id}</td>
                  <td>{p.sexo} · {p.idade}</td><td>{p.tipo_cirurgia}</td><td>{p.dia_pos_atual}</td>
                  <td>{p.status === "concluido_12m" ? "concluído 12m" : "em acompanhamento"}</td>
                  <td>{ult?.pct_twl.toFixed(1)}% {baixo && <span className="ml-1 rounded bg-red-100 px-1.5 text-xs text-red-700">abaixo p10</span>}</td>
                  <td>{cont.get(p.paciente_id) ? <span className="rounded-full bg-amber-100 px-2 text-amber-800">{cont.get(p.paciente_id)}</span> : <span className="text-slate-300">0</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
