export type Paciente = {
  paciente_id: string; sexo: "M" | "F"; idade: number; faixa_etaria: string; uf: string;
  altura_m: number; peso_pre_kg: number; imc_pre: number; tipo_cirurgia: "RYGB" | "Sleeve";
  data_cirurgia: string; dia_pos_atual: number; status: string;
  dm2: boolean; has: boolean; dislipidemia: boolean; apneia_sono: boolean;
  transtorno_humor_previo: boolean; compulsao_alimentar_previa: boolean; tabagismo: boolean;
  vulnerabilidade_social: boolean; distancia_centro_km: number;
};
export type Pesagem = {
  paciente_id: string; dia_pos: number; data: string; peso_kg: number; imc: number;
  pct_twl: number; pct_ewl: number; pas_mmHg: number; pad_mmHg: number; fonte: string;
};
export type Questionario = {
  paciente_id: string; dia_pos: number; data: string; dor_eva_0a10: number; vomitos_semana: number;
  sintomas_dumping: boolean; hidratacao_ml_dia: number; proteina_meta_atingida: boolean;
  uso_diario_suplementos: boolean; phq2_0a6: number; episodio_compulsao: boolean;
  alcool_doses_semana: number; exercicio_min_semana: number; qualidade_vida_0a100: number;
};
export type Exame = {
  paciente_id: string; dia_pos: number; data_coleta: string;
  hemoglobina_g_dl: number; ferritina_ng_ml: number; vitamina_d_ng_ml: number; vitamina_b12_pg_ml: number;
  folato_ng_ml: number; tiamina_b1_nmol_l: number; zinco_ug_dl: number; calcio_mg_dl: number;
  pth_pg_ml: number; albumina_g_dl: number; glicemia_mg_dl: number; hba1c_pct: number;
  ldl_mg_dl: number; hdl_mg_dl: number; triglicerides_mg_dl: number;
  status_laudo: string; liberado_por: string;
};
export type StatusAlerta = "pendente" | "em_analise" | "resolvido";
export type Alerta = {
  alerta_id: string; paciente_id: string; dia_pos: number; data: string; modulo: string;
  responsavel: string; severidade: "baixa" | "media" | "alta"; regra: string; valor: number;
  status: StatusAlerta;
};
export type Auditoria = {
  id: number; quando: string; perfil: string; tabela: string; acao: string; paciente_id: string; detalhe: string;
};
