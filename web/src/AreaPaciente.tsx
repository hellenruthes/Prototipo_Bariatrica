import { useState } from "react";
import { CurvaChart } from "./CurvaChart";
import { HOJE, pacientePorId, pesagensPorPac } from "./data";
import { preverTWL } from "./previsao";
import { useStore } from "./store";
import { Btn, Card, fmt } from "./ui";
import type { Questionario } from "./types";

export function AreaPaciente({ id }: { id: string }) {
  const { exames, questionarios, enviarQuestionario } = useStore();
  const p = pacientePorId.get(id)!;
  const pes = pesagensPorPac.get(id) ?? [];
  const prev = preverTWL(p, pes);
  const ex = exames(id).filter((e) => e.dia_pos >= 0 && e.status_laudo === "liberado").sort((a, b) => b.dia_pos - a.dia_pos);
  const qs = questionarios(id).sort((a, b) => b.dia_pos - a.dia_pos);
  const [f, setF] = useState({ dor_eva_0a10: 2, vomitos_semana: 0, sintomas_dumping: false, hidratacao_ml_dia: 1500, proteina_meta_atingida: true, uso_diario_suplementos: true, phq2_0a6: 0, episodio_compulsao: false, alcool_doses_semana: 0, exercicio_min_semana: 120, qualidade_vida_0a100: 70 });
  const [msg, setMsg] = useState("");
  const ultQ = qs[0]?.dia_pos ?? 0;
  const proxQ = ultQ + 42, proxEx = [180, 365].find((d) => d > p.dia_pos_atual);
  const num = (k: keyof typeof f, l: string, step = 1) => <label className="text-sm">{l}<input type="number" step={step} className="mt-0.5 w-full rounded border border-slate-300 p-1" value={Number(f[k])} onChange={(e) => setF({ ...f, [k]: +e.target.value })} /></label>;
  const chk = (k: keyof typeof f, l: string) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{l}</label>;

  const enviar = () => {
    const q: Questionario = { ...f, paciente_id: id, dia_pos: p.dia_pos_atual, data: HOJE };
    const n = enviarQuestionario(q);
    setMsg(n ? `Obrigado! Sua equipe foi avisada sobre ${n} ponto(s) que merecem atenção.` : "Obrigado! Tudo certo com suas respostas.");
  };
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Olá! Este é o seu acompanhamento</h2>
      <Card title="Minha curva" right={<span className="rounded-lg bg-violet-50 px-2 py-1 text-sm text-violet-800">Previsão aos 12 meses: <b>{fmt(prev.twl12)}%</b> do peso (± {fmt(prev.margem)})</span>}>
        <CurvaChart p={p} pes={pes} prev={prev} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Lembretes"><ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Próximo questionário: {proxQ <= p.dia_pos_atual ? <b className="text-amber-700">já está disponível — responda abaixo</b> : `a partir do dia ${proxQ}`}</li>
          {proxEx && <li>Próxima coleta de exames: dia {proxEx}</li>}
          <li>Tome seus suplementos todos os dias e beba ao menos 1 litro de água.</li>
        </ul></Card>
        <Card title="Exames liberados"><ul className="space-y-1 text-sm">
          {ex.map((e) => <li key={e.dia_pos + e.data_coleta}>{e.data_coleta} (dia {e.dia_pos}): vit. D {e.vitamina_d_ng_ml} · B12 {e.vitamina_b12_pg_ml} · Hb {e.hemoglobina_g_dl} · HbA1c {e.hba1c_pct}</li>)}
          {!ex.length && <li className="text-slate-500">Nenhum exame liberado ainda.</li>}
        </ul></Card>
      </div>
      <Card title="Questionário">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {num("dor_eva_0a10", "Dor (0–10)")}{num("vomitos_semana", "Vômitos por semana")}{num("hidratacao_ml_dia", "Água (mL/dia)", 100)}{num("phq2_0a6", "Humor PHQ-2 (0–6)")}
          {num("alcool_doses_semana", "Álcool (doses/semana)")}{num("exercicio_min_semana", "Exercício (min/sem)")}{num("qualidade_vida_0a100", "Qualidade de vida (0–100)")}
        </div>
        <div className="mt-3 flex flex-wrap gap-4">{chk("sintomas_dumping", "Sintomas de dumping")}{chk("proteina_meta_atingida", "Atingi a meta de proteína")}{chk("uso_diario_suplementos", "Usei os suplementos todo dia")}{chk("episodio_compulsao", "Tive episódio de compulsão")}</div>
        <p className="mt-2 text-xs text-slate-500">Dica para a demo: dor 8 ou PHQ-2 = 4, enviar, e entrar como Enfermagem/Psicólogo para ver o alerta na fila.</p>
        <div className="mt-3"><Btn onClick={enviar}>Enviar respostas</Btn></div>
        {msg && <p className="mt-2 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}
      </Card>
    </div>
  );
}
