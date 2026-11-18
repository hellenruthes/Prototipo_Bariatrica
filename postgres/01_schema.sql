-- =====================================================================
-- Acompanhamento pós-bariátrica — schema PostgreSQL (dados sintéticos)
-- Dois schemas separados = pseudonimização (LGPD arts. 12-13):
--   clinico  -> dados de saúde, chave = paciente_id (pseudônimo)
--   restrito -> identificadores (nome, contato), acesso só do coordenador
-- =====================================================================
DROP SCHEMA IF EXISTS clinico CASCADE;
DROP SCHEMA IF EXISTS restrito CASCADE;
CREATE SCHEMA clinico;
CREATE SCHEMA restrito;

CREATE TYPE clinico.tipo_cirurgia AS ENUM ('RYGB', 'Sleeve');
CREATE TYPE clinico.severidade    AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE clinico.status_alerta AS ENUM ('pendente', 'em_analise', 'resolvido');

-- ---------------------------------------------------------------------
CREATE TABLE clinico.pacientes (
    paciente_id                 varchar(10) PRIMARY KEY,
    sexo                        char(1) NOT NULL CHECK (sexo IN ('F', 'M')),
    idade                       smallint NOT NULL,
    faixa_etaria                varchar(6) NOT NULL,
    uf                          char(2) NOT NULL,
    altura_m                    numeric(3,2) NOT NULL,
    peso_pre_kg                 numeric(5,1) NOT NULL,
    imc_pre                     numeric(4,1) NOT NULL,
    tipo_cirurgia               clinico.tipo_cirurgia NOT NULL,
    data_cirurgia               date NOT NULL,
    dia_pos_atual               smallint NOT NULL,
    status                      varchar(20) NOT NULL,
    dm2                         boolean NOT NULL,
    has                         boolean NOT NULL,
    dislipidemia                boolean NOT NULL,
    apneia_sono                 boolean NOT NULL,
    transtorno_humor_previo     boolean NOT NULL,
    compulsao_alimentar_previa  boolean NOT NULL,
    tabagismo                   boolean NOT NULL,
    vulnerabilidade_social      boolean NOT NULL,
    distancia_centro_km         numeric(6,1)
);

CREATE TABLE clinico.pesagens (
    id          serial PRIMARY KEY,
    paciente_id varchar(10) NOT NULL REFERENCES clinico.pacientes ON DELETE CASCADE,
    dia_pos     smallint NOT NULL,
    data        date NOT NULL,
    peso_kg     numeric(5,1) NOT NULL,
    imc         numeric(4,1),
    pct_twl     numeric(5,1),
    pct_ewl     numeric(5,1),
    pas_mmhg    smallint,
    pad_mmhg    smallint,
    fonte       varchar(10),
    UNIQUE (paciente_id, dia_pos)
);

CREATE TABLE clinico.questionarios (
    id                      serial PRIMARY KEY,
    paciente_id             varchar(10) NOT NULL REFERENCES clinico.pacientes ON DELETE CASCADE,
    dia_pos                 smallint NOT NULL,
    data                    date NOT NULL,
    dor_eva_0a10            smallint CHECK (dor_eva_0a10 BETWEEN 0 AND 10),
    vomitos_semana          smallint,
    sintomas_dumping        boolean,
    hidratacao_ml_dia       smallint,
    proteina_meta_atingida  boolean,
    uso_diario_suplementos  boolean,
    phq2_0a6                smallint CHECK (phq2_0a6 BETWEEN 0 AND 6),
    episodio_compulsao      boolean,
    alcool_doses_semana     smallint,
    exercicio_min_semana    smallint,
    qualidade_vida_0a100    smallint,
    UNIQUE (paciente_id, dia_pos)
);

CREATE TABLE clinico.exames (
    id                  serial PRIMARY KEY,
    paciente_id         varchar(10) NOT NULL REFERENCES clinico.pacientes ON DELETE CASCADE,
    dia_pos             smallint NOT NULL,
    data_coleta         date NOT NULL,
    hemoglobina_g_dl    numeric(4,1),
    ferritina_ng_ml     numeric(6,0),
    vitamina_d_ng_ml    numeric(5,1),
    vitamina_b12_pg_ml  numeric(6,0),
    folato_ng_ml        numeric(5,1),
    tiamina_b1_nmol_l   numeric(5,0),
    zinco_ug_dl         numeric(5,0),
    calcio_mg_dl        numeric(4,1),
    pth_pg_ml           numeric(5,0),
    albumina_g_dl       numeric(4,2),
    glicemia_mg_dl      numeric(5,0),
    hba1c_pct           numeric(4,1),
    ldl_mg_dl           numeric(5,0),
    hdl_mg_dl           numeric(5,0),
    triglicerides_mg_dl numeric(5,0),
    status_laudo        varchar(15) NOT NULL DEFAULT 'pendente',
    liberado_por        varchar(30),
    UNIQUE (paciente_id, dia_pos)
);

CREATE TABLE clinico.alertas (
    alerta_id   varchar(10) PRIMARY KEY,
    paciente_id varchar(10) NOT NULL REFERENCES clinico.pacientes ON DELETE CASCADE,
    dia_pos     smallint NOT NULL,
    data        date NOT NULL,
    modulo      varchar(40) NOT NULL,
    responsavel varchar(30) NOT NULL,
    severidade  clinico.severidade NOT NULL,
    regra       text NOT NULL,
    valor       numeric,
    status      clinico.status_alerta NOT NULL DEFAULT 'pendente',
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON clinico.pesagens (paciente_id, dia_pos);
CREATE INDEX ON clinico.questionarios (paciente_id, dia_pos);
CREATE INDEX ON clinico.exames (paciente_id, dia_pos);
CREATE INDEX ON clinico.alertas (responsavel, status);
CREATE INDEX ON clinico.alertas (paciente_id);

-- ---------------------------------------------------------------------
-- Identificadores: schema separado (em produção: criptografar com pgcrypto)
CREATE TABLE restrito.identificadores (
    paciente_id     varchar(10) PRIMARY KEY REFERENCES clinico.pacientes ON DELETE CASCADE,
    nome_ficticio   text NOT NULL,
    prontuario      varchar(15) UNIQUE NOT NULL,
    data_nascimento date,
    email           text,
    telefone        text
);

-- ---------------------------------------------------------------------
-- Log de auditoria (LGPD: quem acessou/alterou o quê)
CREATE TABLE clinico.audit_log (
    id          bigserial PRIMARY KEY,
    quando      timestamptz NOT NULL DEFAULT now(),
    usuario     text NOT NULL DEFAULT current_setting('app.usuario', true),
    papel       text DEFAULT current_setting('app.papel', true),
    acao        varchar(10) NOT NULL,          -- SELECT/INSERT/UPDATE/DELETE
    tabela      text NOT NULL,
    paciente_id varchar(10),
    detalhe     jsonb
);

-- Trigger: toda alteração em alertas/exames/questionários vai para o log.
-- A API faz:  SET LOCAL app.usuario = 'joana'; SET LOCAL app.papel = 'nutricionista';
CREATE OR REPLACE FUNCTION clinico.fn_auditar() RETURNS trigger AS $$
BEGIN
    INSERT INTO clinico.audit_log (usuario, acao, tabela, paciente_id, detalhe)
    VALUES (coalesce(current_setting('app.usuario', true), current_user),
            TG_OP, TG_TABLE_NAME,
            coalesce(NEW.paciente_id, OLD.paciente_id),
            jsonb_build_object('antes', to_jsonb(OLD), 'depois', to_jsonb(NEW)));
    IF TG_TABLE_NAME = 'alertas' AND TG_OP = 'UPDATE' THEN
        NEW.atualizado_em := now();
    END IF;
    RETURN coalesce(NEW, OLD);
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_alertas BEFORE INSERT OR UPDATE OR DELETE ON clinico.alertas
    FOR EACH ROW EXECUTE FUNCTION clinico.fn_auditar();
CREATE TRIGGER trg_audit_exames AFTER INSERT OR UPDATE OR DELETE ON clinico.exames
    FOR EACH ROW EXECUTE FUNCTION clinico.fn_auditar();
CREATE TRIGGER trg_audit_quest AFTER INSERT OR UPDATE OR DELETE ON clinico.questionarios
    FOR EACH ROW EXECUTE FUNCTION clinico.fn_auditar();
