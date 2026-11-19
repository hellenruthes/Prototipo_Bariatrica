import { useState, type ReactNode } from "react";
import { CurvaChart } from "./CurvaChart";
import { identificacaoFicticia, pacientePorId, pesagensPorPac } from "./data";
import { MODULOS, modulosVisiveis, podeEditar, podeVerIdentificacao, quemEdita, type Modulo } from "./permissoes";
import { preverTWL } from "./previsao";
import { useStore } from "./store";
import { Btn, Card, Sev, StatusTag, fmt } from "./ui";
import type { Exame, Paciente } from "./types";

const Linha = ({ k, v, alerta }: { k: string; v: ReactNode; alerta?: boolean }) => (
  <div className="flex justify-between gap-3 border-b border-slate-50 py-0.5 text-sm"><span className="text-slate-500">{k}</span><span className={alerta ? "font-semibold text-red-700" : ""}>{v}</span></div>
);
const sn = (b: boolean) => (b ? "sim" : "não");

export function Prontuario({ id, voltar }: { id: string; voltar: () => void }) {
  const { sessao, alertas, exames, questionarios } = useStore();
  const p = pacientePorId.get(id)!;
  const [aba, setAba] = useState<"pre" | "pos">("pos");
  const pes = pesagensPorPac.get(id) ?? [];
  const ex = exames(id).sort((a, b) => a.dia_pos - b.dia_pos);
  const qs = questionarios(id).sort((a, b) => a.dia_pos - b.dia_pos);
  const prev = preverTWL(p, pes);
  const meusAl = alertas.filter((a) => a.paciente_id === id);
  const visiveis = modulosVisiveis(sessao!.papel);
  const ult = [...pes].sort((a, b) => b.dia_pos - a.dia_pos)[0];

  const timeline = [
    ...pes.filter((x) => x.dia_pos >= 0).map((x) => ({ dia: x.dia_pos, t: "Pesagem", d: `${x.peso_kg} kg · %TWL ${x.pct_twl}` })),
    ...qs.map((x) => ({ dia: x.dia_pos, t: "Questionário", d: `dor ${x.dor_eva_0a10} · PHQ-2 ${x.phq2_0a6} · QV ${x.qualidade_vida_0a100}` })),
    ...ex.filter((x) => x.dia_pos >= 0).map((x) => ({ dia: x.dia_pos, t: "Exame liberado", d: `vit D ${x.vitamina_d_ng_ml} · B12 ${x.vitamina_b12_pg_ml} · HbA1c ${x.hba1c_pct}` })),
    ...meusAl.map((x) => ({ dia: x.dia_pos, t: "Alerta", d: `${x.regra} (${x.status})` })),
  ].sort((a, b) => b.dia - a.dia);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Btn kind="ghost" onClick={voltar}>← voltar</Btn>
        <h2 className="text-xl font-semibold">{id}</h2>
        <span className="text-sm text-slate-600">{p.sexo === "F" ? "Mulher" : "Homem"}, {p.idade} anos · {p.tipo_cirurgia} · dia {p.dia_pos_atual} · %TWL {ult?.pct_twl.toFixed(1)}%</span>
      </div>
      <div className="flex gap-2">
        {(["pre", "pos"] as const).map((a) => (
          <button key={a} onClick={() => setAba(a)} className={`rounded-lg px-4 py-1.5 text-sm ${aba === a ? "bg-teal-700 text-white" : "bg-white ring-1 ring-slate-200"}`}>{a === "pre" ? "Pré-operatório" : "Pós-operatório"}</button>
        ))}
      </div>

      {aba === "pre" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Cadastro clínico">
            <Linha k="Altura" v={`${p.altura_m} m`} /><Linha k="Peso pré" v={`${p.peso_pre_kg} kg`} /><Linha k="IMC pré" v={p.imc_pre} />
            <Linha k="Data da cirurgia" v={p.data_cirurgia} /><Linha k="UF" v={p.uf} />
            <Linha k="DM2" v={sn(p.dm2)} /><Linha k="HAS" v={sn(p.has)} /><Linha k="Dislipidemia" v={sn(p.dislipidemia)} /><Linha k="Apneia do sono" v={sn(p.apneia_sono)} />
            <Linha k="Transtorno de humor prévio" v={sn(p.transtorno_humor_previo)} /><Linha k="Compulsão alimentar prévia" v={sn(p.compulsao_alimentar_previa)} />
            <Linha k="Tabagismo" v={sn(p.tabagismo)} /><Linha k="Vulnerabilidade social" v={sn(p.vulnerabilidade_social)} /><Linha k="Distância do centro" v={`${p.distancia_centro_km} km`} />
          </Card>
          <Card title="Exames pré-op">
            {ex.filter((e) => e.dia_pos < 0).map((e) => <TabelaExame key={e.dia_pos} e={e} />)}
            {!ex.some((e) => e.dia_pos < 0) && <p className="text-sm text-slate-500">Sem exames pré.</p>}
          </Card>
        </div>
      ) : (
        <>
          <Card title="Curva de perda de peso e previsão aos 12 meses"
            right={<span className="rounded-lg bg-violet-50 px-2 py-1 text-sm text-violet-800">Previsto: <b>{fmt(prev.twl12)}%</b> TWL ± {fmt(prev.margem)} <span className="text-xs">(modelo {prev.modelo === "precoce" ? "precoce, usa dias 30 e 90" : "pré-op"})</span></span>}>
            <CurvaChart p={p} pes={pes} prev={prev} />
            <p className="text-xs text-slate-500">Faixa cinza = p10–p90 dos pacientes com a mesma cirurgia. Modelo treinado com dados sintéticos — demonstração, não decisão clínica.</p>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Linha do tempo"><ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
              {timeline.map((t, i) => <li key={i} className="flex gap-2"><span className="w-14 shrink-0 text-slate-400">dia {t.dia}</span><span className="w-28 shrink-0 font-medium">{t.t}</span><span className="text-slate-600">{t.d}</span></li>)}
            </ul></Card>
            <Card title="Alertas deste paciente"><ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {meusAl.sort((a, b) => b.dia_pos - a.dia_pos).map((a) => <li key={a.alerta_id} className="flex items-center gap-2"><Sev s={a.severidade} /><span className="flex-1">{a.regra}</span><StatusTag s={a.status} /></li>)}
              {!meusAl.length && <li className="text-slate-500">Nenhum alerta.</li>}
            </ul></Card>
          </div>
          <h3 className="pt-2 font-semibold text-slate-900">Módulos</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {MODULOS.filter((m) => visiveis.includes(m)).map((m) => <CardModulo key={m} modulo={m} p={p} />)}
          </div>
        </>
      )}
    </div>
  );
}

function TabelaExame({ e }: { e: Exame }) {
  const linhas: [string, number, boolean][] = [
    ["Vitamina D (ng/mL)", e.vitamina_d_ng_ml, e.vitamina_d_ng_ml < 20], ["B12 (pg/mL)", e.vitamina_b12_pg_ml, e.vitamina_b12_pg_ml < 200],
    ["Hemoglobina (g/dL)", e.hemoglobina_g_dl, e.hemoglobina_g_dl < 11.5], ["Ferritina (ng/mL)", e.ferritina_ng_ml, e.ferritina_ng_ml < 15],
    ["Albumina (g/dL)", e.albumina_g_dl, e.albumina_g_dl < 3.5], ["HbA1c (%)", e.hba1c_pct, e.hba1c_pct >= 7], ["Glicemia (mg/dL)", e.glicemia_mg_dl, e.glicemia_mg_dl < 54],
    ["LDL (mg/dL)", e.ldl_mg_dl, false], ["Triglicérides (mg/dL)", e.triglicerides_mg_dl, false],
  ];
  return <div className="mb-3"><div className="mb-1 text-xs font-semibold uppercase text-slate-500">Coleta {e.data_coleta} (dia {e.dia_pos}) · {e.status_laudo}</div>{linhas.map(([k, v, a]) => <Linha key={k} k={k} v={v} alerta={a} />)}</div>;
}

function CardModulo({ modulo, p }: { modulo: Modulo; p: Paciente }) {
  const { sessao, exames, questionarios, registro, salvarRegistro, liberarExame } = useStore();
  const papel = sessao!.papel;
  const editavel = podeEditar(papel, modulo);
  const [edit, setEdit] = useState(false);
  const [txt, setTxt] = useState("");
  const [msg, setMsg] = useState("");
  const q = [...questionarios(p.paciente_id)].sort((a, b) => b.dia_pos - a.dia_pos)[0];
  const ex = [...exames(p.paciente_id)].sort((a, b) => b.dia_pos - a.dia_pos);
  const e = ex[0];
  const pes = [...(pesagensPorPac.get(p.paciente_id) ?? [])].sort((a, b) => b.dia_pos - a.dia_pos)[0];
  const reg = registro(p.paciente_id, modulo);
  const idf = identificacaoFicticia(p.paciente_id);

  const resumo: Record<Modulo, ReactNode> = {
    "Recuperação cirúrgica": q && <><Linha k="Dor (EVA)" v={q.dor_eva_0a10} alerta={q.dor_eva_0a10 > 5} /><Linha k="Vômitos/semana" v={q.vomitos_semana} alerta={q.vomitos_semana >= 3} /><Linha k="Dumping" v={sn(q.sintomas_dumping)} /></>,
    "Metabólico": <><Linha k="DM2 / HAS / dislipidemia" v={`${sn(p.dm2)} / ${sn(p.has)} / ${sn(p.dislipidemia)}`} />{e && <Linha k="HbA1c" v={`${e.hba1c_pct}%`} alerta={e.hba1c_pct >= 7} />}{pes && <Linha k="Pressão" v={`${pes.pas_mmHg}/${pes.pad_mmHg}`} />}</>,
    "Nutricional": <>{q && <><Linha k="Hidratação" v={`${q.hidratacao_ml_dia} mL/dia`} alerta={q.hidratacao_ml_dia < 1000} /><Linha k="Meta de proteína" v={sn(q.proteina_meta_atingida)} /><Linha k="Suplemento diário" v={sn(q.uso_diario_suplementos)} /></>}{e && <><Linha k="Vitamina D" v={e.vitamina_d_ng_ml} alerta={e.vitamina_d_ng_ml < 20} /><Linha k="B12" v={e.vitamina_b12_pg_ml} alerta={e.vitamina_b12_pg_ml < 200} /></>}</>,
    "Emocional e comportamental": <><Linha k="Humor prévio / compulsão prévia" v={`${sn(p.transtorno_humor_previo)} / ${sn(p.compulsao_alimentar_previa)}`} />{q && <><Linha k="PHQ-2" v={q.phq2_0a6} alerta={q.phq2_0a6 >= 3} /><Linha k="Compulsão" v={sn(q.episodio_compulsao)} /><Linha k="Álcool (doses/sem)" v={q.alcool_doses_semana} /></>}</>,
    "Atividade física": q && <><Linha k="Exercício" v={`${q.exercicio_min_semana} min/semana`} /><Linha k="Qualidade de vida" v={`${q.qualidade_vida_0a100}/100`} /></>,
    "Medicamentos": <p className="text-sm text-slate-500">Sem dados automáticos — use o registro abaixo.</p>,
    "Apoio social": <><Linha k="Vulnerabilidade social" v={sn(p.vulnerabilidade_social)} alerta={p.vulnerabilidade_social} /><Linha k="Distância do centro" v={`${p.distancia_centro_km} km`} /><Linha k="UF" v={p.uf} /></>,
    "Coordenação": podeVerIdentificacao(papel) ? <><Linha k="Nome" v={idf.nome} /><Linha k="E-mail" v={idf.email} /><Linha k="Telefone" v={idf.telefone} /><p className="mt-1 text-xs text-slate-500">Vem do schema <code>restrito</code>, separado dos dados de saúde.</p></> : null,
    "Laboratório": <div className="max-h-72 overflow-y-auto">{ex.slice(0, 2).map((x) => <TabelaExame key={x.dia_pos + x.data_coleta} e={x} />)}</div>,
  };

  const salvar = () => { salvarRegistro(p.paciente_id, modulo, txt); setEdit(false); };
  return (
    <Card title={modulo} right={editavel ? <Btn kind="ghost" onClick={() => { setTxt(reg?.texto ?? ""); setEdit(!edit); setMsg(""); }}>{edit ? "Cancelar" : modulo === "Laboratório" ? "Liberar exame" : "Editar"}</Btn> : <span className="text-xs text-slate-400">somente leitura · edita: {quemEdita(modulo).join(", ")}</span>}>
      {resumo[modulo]}
      {modulo === "Laboratório" && edit && <FormExame p={p} base={e} onOk={(n) => { setEdit(false); setMsg(`Laudo liberado. ${n} alerta(s) gerado(s) para os profissionais responsáveis.`); }} liberar={liberarExame} />}
      {modulo !== "Laboratório" && (edit ? (
        <div className="mt-2 space-y-2"><textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Conduta / observações do profissional" /><Btn onClick={salvar}>Salvar</Btn></div>
      ) : reg ? <div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm"><div>{reg.texto}</div><div className="mt-1 text-xs text-slate-500">por {reg.por} · {reg.em}</div></div> : modulo !== "Coordenação" && <p className="mt-2 text-xs text-slate-400">Sem registro do profissional.</p>)}
      {msg && <p className="mt-2 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{msg}</p>}
    </Card>
  );
}

function FormExame({ p, base, liberar, onOk }: { p: Paciente; base?: Exame; liberar: (e: Exame) => number; onOk: (n: number) => void }) {
  const ini = base ?? ({} as Exame);
  const [v, setV] = useState({ vitamina_d_ng_ml: ini.vitamina_d_ng_ml ?? 30, vitamina_b12_pg_ml: ini.vitamina_b12_pg_ml ?? 450, hemoglobina_g_dl: ini.hemoglobina_g_dl ?? 13, albumina_g_dl: ini.albumina_g_dl ?? 4, hba1c_pct: ini.hba1c_pct ?? 5.6, ferritina_ng_ml: ini.ferritina_ng_ml ?? 80 });
  const campos: [keyof typeof v, string][] = [["vitamina_d_ng_ml", "Vitamina D"], ["vitamina_b12_pg_ml", "B12"], ["hemoglobina_g_dl", "Hemoglobina"], ["albumina_g_dl", "Albumina"], ["hba1c_pct", "HbA1c"], ["ferritina_ng_ml", "Ferritina"]];
  return (
    <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
      <p className="mb-2 text-xs text-slate-600">Dica para a demo: coloque vitamina D = 12 ou HbA1c = 7,8 e libere.</p>
      <div className="grid grid-cols-2 gap-2">{campos.map(([k, l]) => <label key={k} className="text-xs">{l}<input type="number" step="0.1" className="mt-0.5 w-full rounded border border-slate-300 p-1 text-sm" value={v[k]} onChange={(e) => setV({ ...v, [k]: +e.target.value })} /></label>)}</div>
      <div className="mt-2"><Btn onClick={() => onOk(liberar({ ...({ folato_ng_ml: 8, tiamina_b1_nmol_l: 120, zinco_ug_dl: 100, calcio_mg_dl: 9.2, pth_pg_ml: 40, glicemia_mg_dl: 95, ldl_mg_dl: 100, hdl_mg_dl: 50, triglicerides_mg_dl: 130, ...base } as Exame), ...v, paciente_id: p.paciente_id, dia_pos: p.dia_pos_atual, data_coleta: "2026-11-18", status_laudo: "liberado", liberado_por: "analista_lab" }))}>Liberar laudo</Btn></div>
    </div>
  );
}
