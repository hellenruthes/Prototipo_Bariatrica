import type { Alerta, Exame, Questionario } from "./types";

type Nova = Omit<Alerta, "alerta_id" | "paciente_id" | "dia_pos" | "data" | "status">;
const a = (modulo: string, responsavel: string, severidade: Alerta["severidade"], regra: string, valor: number): Nova =>
  ({ modulo, responsavel, severidade, regra, valor });

export function alertasDoQuestionario(q: Questionario, anterior?: Questionario): Nova[] {
  const r: Nova[] = [];
  if (q.dor_eva_0a10 > 5) r.push(a("Recuperação cirúrgica", "enfermagem", q.dor_eva_0a10 >= 8 ? "alta" : "media", "Dor EVA > 5 (critério BELLA)", q.dor_eva_0a10));
  if (q.vomitos_semana >= 3) r.push(a("Recuperação cirúrgica", "enfermagem", "media", "Vômitos >= 3/semana (risco de desidratação/def. tiamina)", q.vomitos_semana));
  if (q.hidratacao_ml_dia < 1000) r.push(a("Nutricional", "nutricionista", "media", "Hidratação < 1000 mL/dia", q.hidratacao_ml_dia));
  if (!q.uso_diario_suplementos && anterior && !anterior.uso_diario_suplementos)
    r.push(a("Nutricional", "nutricionista", "media", "Sem suplementação diária em 2 questionários seguidos", 0));
  if (q.phq2_0a6 >= 3) r.push(a("Emocional e comportamental", "psicologo", q.phq2_0a6 >= 5 ? "alta" : "media", "PHQ-2 >= 3 (rastreio positivo para depressão)", q.phq2_0a6));
  if (q.episodio_compulsao) r.push(a("Emocional e comportamental", "psicologo", "media", "Episódio de compulsão relatado", 1));
  if (q.alcool_doses_semana >= 7) r.push(a("Emocional e comportamental", "psicologo", "alta", "Álcool >= 7 doses/semana (transferência de adicção)", q.alcool_doses_semana));
  return r;
}

export function alertasDoExame(e: Exame): Nova[] {
  const r: Nova[] = [];
  if (e.vitamina_d_ng_ml < 20) r.push(a("Nutricional", "nutricionista", "media", "Vitamina D < 20 ng/mL", e.vitamina_d_ng_ml));
  if (e.vitamina_b12_pg_ml < 200) r.push(a("Nutricional", "nutrologo", "media", "B12 < 200 pg/mL", e.vitamina_b12_pg_ml));
  if (e.hemoglobina_g_dl < 11.5) r.push(a("Nutricional", "nutrologo", "alta", "Anemia (Hb < 11,5)", e.hemoglobina_g_dl));
  if (e.albumina_g_dl < 3.5) r.push(a("Nutricional", "nutrologo", "alta", "Albumina < 3,5 g/dL (desnutrição proteica)", e.albumina_g_dl));
  if (e.ferritina_ng_ml < 15) r.push(a("Nutricional", "nutrologo", "media", "Ferritina < 15 ng/mL", e.ferritina_ng_ml));
  if (e.hba1c_pct >= 7) r.push(a("Metabólico", "endocrinologista", "media", "HbA1c >= 7%", e.hba1c_pct));
  if (e.glicemia_mg_dl < 54) r.push(a("Metabólico", "endocrinologista", "alta", "Hipoglicemia", e.glicemia_mg_dl));
  return r;
}
