import { useState } from "react";
import { filtrarAlertas, PAPEIS, type Papel } from "./permissoes";
import { useStore } from "./store";
import { Btn, Card, Sev, StatusTag } from "./ui";
import type { StatusAlerta } from "./types";

const PROX: Record<StatusAlerta, StatusAlerta | null> = { pendente: "em_analise", em_analise: "resolvido", resolvido: null };
const ROTULO = { pendente: "Assumir (em análise)", em_analise: "Marcar resolvido", resolvido: "" };

export function Alertas({ abrir }: { abrir: (id: string) => void }) {
  const { sessao, alertas, mudarStatus } = useStore();
  const papel = sessao!.papel;
  const [st, setSt] = useState<StatusAlerta | "">("pendente");
  const nome = (r: string) => PAPEIS.find((p) => p.id === (r as Papel))?.nome ?? r;
  const lista = filtrarAlertas(papel, alertas).filter((a) => !st || a.status === st)
    .sort((a, b) => ({ alta: 0, media: 1, baixa: 2 }[a.severidade] - { alta: 0, media: 1, baixa: 2 }[b.severidade]) || b.dia_pos - a.dia_pos);
  const pode = papel !== "coordenador";
  return (
    <Card title={papel === "coordenador" ? "Todos os alertas" : "Minha fila de alertas"}
      right={<select className="rounded-lg border border-slate-300 p-1.5 text-sm" value={st} onChange={(e) => setSt(e.target.value as StatusAlerta | "")}>
        <option value="">todos</option><option value="pendente">pendente</option><option value="em_analise">em análise</option><option value="resolvido">resolvido</option></select>}>
      <p className="mb-2 text-xs text-slate-500">{lista.length} alertas · {pode ? "avance o status e veja o registro de alterações" : "coordenador só acompanha"}</p>
      <ul className="divide-y divide-slate-100">
        {lista.slice(0, 80).map((a) => (
          <li key={a.alerta_id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
            <Sev s={a.severidade} />
            <div className="min-w-56 flex-1">
              <div className="font-medium">{a.regra}</div>
              <div className="text-xs text-slate-500">{a.modulo} · para {nome(a.responsavel)} · dia {a.dia_pos} · valor {a.valor}</div>
            </div>
            <button className="text-teal-800 underline" onClick={() => abrir(a.paciente_id)}>{a.paciente_id}</button>
            <StatusTag s={a.status} />
            {pode && PROX[a.status] && <Btn kind="ghost" onClick={() => mudarStatus(a.alerta_id, PROX[a.status]!)}>{ROTULO[a.status]}</Btn>}
          </li>
        ))}
        {!lista.length && <li className="py-6 text-center text-slate-500">Nada por aqui 🎉</li>}
      </ul>
    </Card>
  );
}
