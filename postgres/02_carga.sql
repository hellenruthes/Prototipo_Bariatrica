-- Carga dos CSVs. Rode de dentro da pasta "bariatrica":
--   psql -d bariatrica -f postgres/02_carga.sql
-- (\copy lê o arquivo na SUA máquina, então funciona até com banco na nuvem)

-- triggers de auditoria desligados durante a carga inicial
ALTER TABLE clinico.alertas       DISABLE TRIGGER trg_audit_alertas;
ALTER TABLE clinico.exames        DISABLE TRIGGER trg_audit_exames;
ALTER TABLE clinico.questionarios DISABLE TRIGGER trg_audit_quest;

\copy clinico.pacientes FROM 'dados/pacientes.csv' WITH (FORMAT csv, HEADER true)
\copy restrito.identificadores FROM 'dados/identificadores_RESTRITO.csv' WITH (FORMAT csv, HEADER true)
\copy clinico.pesagens (paciente_id, dia_pos, data, peso_kg, imc, pct_twl, pct_ewl, pas_mmhg, pad_mmhg, fonte) FROM 'dados/pesagens.csv' WITH (FORMAT csv, HEADER true)
\copy clinico.questionarios (paciente_id, dia_pos, data, dor_eva_0a10, vomitos_semana, sintomas_dumping, hidratacao_ml_dia, proteina_meta_atingida, uso_diario_suplementos, phq2_0a6, episodio_compulsao, alcool_doses_semana, exercicio_min_semana, qualidade_vida_0a100) FROM 'dados/questionarios_paciente.csv' WITH (FORMAT csv, HEADER true)
\copy clinico.exames (paciente_id, dia_pos, data_coleta, hemoglobina_g_dl, ferritina_ng_ml, vitamina_d_ng_ml, vitamina_b12_pg_ml, folato_ng_ml, tiamina_b1_nmol_l, zinco_ug_dl, calcio_mg_dl, pth_pg_ml, albumina_g_dl, glicemia_mg_dl, hba1c_pct, ldl_mg_dl, hdl_mg_dl, triglicerides_mg_dl, status_laudo, liberado_por) FROM 'dados/exames.csv' WITH (FORMAT csv, HEADER true)
\copy clinico.alertas (alerta_id, paciente_id, dia_pos, data, modulo, responsavel, severidade, regra, valor, status) FROM 'dados/alertas.csv' WITH (FORMAT csv, HEADER true)

ALTER TABLE clinico.alertas       ENABLE TRIGGER trg_audit_alertas;
ALTER TABLE clinico.exames        ENABLE TRIGGER trg_audit_exames;
ALTER TABLE clinico.questionarios ENABLE TRIGGER trg_audit_quest;

SELECT 'pacientes' AS tabela, count(*) FROM clinico.pacientes
UNION ALL SELECT 'identificadores', count(*) FROM restrito.identificadores
UNION ALL SELECT 'pesagens', count(*) FROM clinico.pesagens
UNION ALL SELECT 'questionarios', count(*) FROM clinico.questionarios
UNION ALL SELECT 'exames', count(*) FROM clinico.exames
UNION ALL SELECT 'alertas', count(*) FROM clinico.alertas;
