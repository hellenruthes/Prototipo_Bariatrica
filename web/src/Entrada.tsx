import { useState } from "react";
import { BASE } from "./data";
import { PAPEIS, type Papel } from "./permissoes";
import { useStore } from "./store";
import { Btn, Card } from "./ui";

export function Entrada() {
  const { setSessao } = useStore();
  const [tipo, setTipo] = useState<"profissional" | "coordenador" | "paciente">("profissional");
  const [papel, setPapel] = useState<Papel>("nutricionista");
  const [pid, setPid] = useState("P0001");
  const profissionais = PAPEIS.filter((p) => p.id !== "coordenador" && p.id !== "paciente");
  const pacs = BASE.pacientes.filter((p) => p.status === "em_acompanhamento");

  const entrar = () => setSessao(tipo === "coordenador" ? { papel: "coordenador" } : tipo === "paciente" ? { papel: "paciente", pacienteId: pid } : { papel });
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Acompanhamento pós-bariátrica</h1>
        <p className="text-sm text-slate-600">Demo com dados 100% sintéticos · quem está entrando?</p>
      </div>
      <Card>
        <div className="grid grid-cols-3 gap-2">
          {(["profissional", "coordenador", "paciente"] as const).map((t) => (
            <button key={t} onClick={() => setTipo(t)} className={`rounded-lg border px-3 py-2 text-sm capitalize ${tipo === t ? "border-teal-700 bg-teal-50 font-semibold text-teal-900" : "border-slate-200 hover:bg-slate-50"}`}>{t}</button>
          ))}
        </div>
        <div className="mt-4 min-h-16">
          {tipo === "profissional" && (
            <label className="block text-sm">Qual o seu papel?
              <select className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
                {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
          )}
          {tipo === "coordenador" && <p className="text-sm text-slate-600">Vê tudo, inclusive nome/contato e o registro de alterações. Edita só o módulo Coordenação.</p>}
          {tipo === "paciente" && (
            <label className="block text-sm">Qual paciente é você?
              <select className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={pid} onChange={(e) => setPid(e.target.value)}>
                {pacs.map((p) => <option key={p.paciente_id} value={p.paciente_id}>{p.paciente_id} · {p.tipo_cirurgia} · dia {p.dia_pos_atual}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="mt-2 flex justify-end"><Btn onClick={entrar}>Entrar</Btn></div>
      </Card>
      <p className="text-xs text-slate-500">Sem login nesta fase: as regras de acesso valem só no front (ver permissoes.ts).</p>
    </div>
  );
}
