-- =====================================================================
-- Views para dashboards + papéis de acesso (rodar depois da carga)
-- =====================================================================

-- Última pesagem de cada paciente
CREATE OR REPLACE VIEW clinico.vw_ultima_pesagem AS
SELECT DISTINCT ON (paciente_id) paciente_id, dia_pos, data, peso_kg, imc, pct_twl, pct_ewl
FROM clinico.pesagens
WHERE dia_pos >= 0
ORDER BY paciente_id, dia_pos DESC;

-- Lista de pacientes para a tela inicial (sem identificadores)
CREATE OR REPLACE VIEW clinico.vw_lista_pacientes AS
SELECT p.paciente_id, p.sexo, p.faixa_etaria, p.tipo_cirurgia, p.data_cirurgia, p.dia_pos_atual, p.status,
       u.peso_kg AS peso_atual, u.pct_twl AS pct_twl_atual,
       count(a.*) FILTER (WHERE a.status <> 'resolvido')                       AS alertas_abertos,
       count(a.*) FILTER (WHERE a.status <> 'resolvido' AND a.severidade = 'alta') AS alertas_altos
FROM clinico.pacientes p
LEFT JOIN clinico.vw_ultima_pesagem u USING (paciente_id)
LEFT JOIN clinico.alertas a USING (paciente_id)
GROUP BY p.paciente_id, u.peso_kg, u.pct_twl;

-- Fila de alertas por profissional
CREATE OR REPLACE VIEW clinico.vw_fila_alertas AS
SELECT a.*, p.tipo_cirurgia, p.dia_pos_atual
FROM clinico.alertas a JOIN clinico.pacientes p USING (paciente_id)
WHERE a.status <> 'resolvido'
ORDER BY CASE a.severidade WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, a.data;

-- Dashboard AGREGADO e ANONIMIZADO: k-anonimato (k = 5) -> grupos pequenos somem
CREATE OR REPLACE VIEW clinico.vw_dashboard_coorte AS
SELECT p.tipo_cirurgia, p.faixa_etaria, p.sexo,
       count(*)                              AS n_pacientes,
       round(avg(u.pct_twl), 1)              AS media_pct_twl_atual,
       round(avg(p.imc_pre), 1)              AS media_imc_pre,
       round(100.0 * avg(p.dm2::int), 0)     AS pct_dm2
FROM clinico.pacientes p JOIN clinico.vw_ultima_pesagem u USING (paciente_id)
GROUP BY 1, 2, 3
HAVING count(*) >= 5;

-- Perda de peso média por mês e cirurgia (gráfico de linhas do dashboard)
CREATE OR REPLACE VIEW clinico.vw_curva_media AS
SELECT p.tipo_cirurgia, w.dia_pos, count(*) AS n,
       round(avg(w.pct_twl), 1) AS media_twl,
       round(percentile_cont(0.1) WITHIN GROUP (ORDER BY w.pct_twl)::numeric, 1) AS p10,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY w.pct_twl)::numeric, 1) AS p50,
       round(percentile_cont(0.9) WITHIN GROUP (ORDER BY w.pct_twl)::numeric, 1) AS p90
FROM clinico.pesagens w JOIN clinico.pacientes p USING (paciente_id)
WHERE w.dia_pos >= 0
GROUP BY 1, 2
HAVING count(*) >= 5;

-- Deficiências nutricionais por momento (6 e 12 meses)
CREATE OR REPLACE VIEW clinico.vw_deficiencias AS
SELECT p.tipo_cirurgia, e.dia_pos, count(*) AS n,
       round(100.0 * avg((e.vitamina_d_ng_ml   < 20)::int), 1) AS pct_def_vit_d,
       round(100.0 * avg((e.vitamina_b12_pg_ml < 200)::int), 1) AS pct_def_b12,
       round(100.0 * avg((e.hemoglobina_g_dl   < 11.5)::int), 1) AS pct_anemia,
       round(100.0 * avg((e.albumina_g_dl      < 3.5)::int), 1) AS pct_hipoalbuminemia
FROM clinico.exames e JOIN clinico.pacientes p USING (paciente_id)
GROUP BY 1, 2
HAVING count(*) >= 5;

-- ---------------------------------------------------------------------
-- Papéis (RBAC no banco). A API conecta como app_clinico; só o coordenador
-- enxerga o schema restrito. Senhas aqui são de exemplo — troque!
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_clinico') THEN
        CREATE ROLE app_clinico LOGIN PASSWORD 'troque_esta_senha';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_coordenador') THEN
        CREATE ROLE app_coordenador LOGIN PASSWORD 'troque_esta_senha_tambem';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_dashboard') THEN
        CREATE ROLE app_dashboard LOGIN PASSWORD 'troque_esta_tambem';
    END IF;
END $$;

-- clínico: lê e escreve dados de saúde, NUNCA vê identificadores
GRANT USAGE ON SCHEMA clinico TO app_clinico, app_coordenador, app_dashboard;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA clinico TO app_clinico, app_coordenador;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA clinico TO app_clinico, app_coordenador;
REVOKE UPDATE, DELETE ON clinico.audit_log FROM app_clinico, app_coordenador;  -- log é só-inserção

-- dashboard: só as views agregadas/anonimizadas
REVOKE ALL ON ALL TABLES IN SCHEMA clinico FROM app_dashboard;
GRANT SELECT ON clinico.vw_dashboard_coorte, clinico.vw_curva_media, clinico.vw_deficiencias TO app_dashboard;

-- coordenador: único que acessa identificadores
REVOKE ALL ON SCHEMA restrito FROM PUBLIC;
GRANT USAGE ON SCHEMA restrito TO app_coordenador;
GRANT SELECT ON restrito.identificadores TO app_coordenador;
