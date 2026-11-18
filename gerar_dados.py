"""
Gerador de base SINTÉTICA de acompanhamento pós-cirurgia bariátrica (12 meses).

Nenhum dado aqui é de pessoa real. Parâmetros calibrados com o BELLA Pilot Trial
(Yang et al., Obes Surg 2023;33:1702-1709):
  - %TWL em 12 meses ~31-33%  |  RYGB ~62%, sleeve ~38%  |  mulheres ~75%
  - idade média ~43 anos       |  deficiência de vitamina D em ~30% aos 12 meses
  - questionários a cada 6 semanas até 9 meses + 1 aos 12 meses
  - alerta quando dor (EVA) > 5

Uso:  python3 gerar_dados.py [n_pacientes] [semente] [pasta_saida]
Saída: pasta ./dados com CSVs + JSON
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

N = int(sys.argv[1]) if len(sys.argv) > 1 else 400
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 42
rng = np.random.default_rng(SEED)
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else Path(__file__).parent / "dados"
OUT.mkdir(exist_ok=True)

UFS = ["SP", "RJ", "MG", "PR", "RS", "SC", "BA", "PE", "GO", "DF", "CE", "ES"]
UF_P = np.array([30, 12, 12, 8, 7, 5, 6, 5, 4, 4, 4, 3], float)
UF_P /= UF_P.sum()
NOMES_F = ["Ana", "Maria", "Juliana", "Fernanda", "Patrícia", "Camila", "Aline", "Luciana",
           "Vanessa", "Renata", "Carla", "Débora", "Priscila", "Tatiane", "Simone", "Eliane"]
NOMES_M = ["José", "Carlos", "Marcos", "Paulo", "Rafael", "Bruno", "Rodrigo", "Fábio",
           "Leandro", "Thiago", "André", "Diego"]
SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues",
              "Almeida", "Nascimento", "Carvalho", "Gomes", "Ribeiro", "Martins", "Rocha"]

# dias de seguimento
DIAS_PESO = [-90, 0, 7, 30, 42, 84, 90, 126, 168, 180, 210, 252, 270, 365]
DIAS_QUEST = [42, 84, 126, 168, 210, 252, 365]          # BELLA: a cada 6 semanas + 12 meses
DIAS_EXAME = [-30, 180, 365]                            # pré-op, 6 e 12 meses


def faixa_etaria(i):
    return "18-29" if i < 30 else "30-39" if i < 40 else "40-49" if i < 50 else "50-59" if i < 60 else "60+"


# ---------------------------------------------------------------- pacientes
pac, ident = [], []
for k in range(N):
    pid = f"P{k + 1:04d}"
    sexo = "F" if rng.random() < 0.75 else "M"
    idade = int(np.clip(rng.normal(43, 10), 19, 68))
    altura = round(float(np.clip(rng.normal(1.63 if sexo == "F" else 1.76, 0.065), 1.45, 1.98)), 2)
    imc_pre = float(np.clip(rng.lognormal(np.log(44), 0.13), 35.2, 68))
    peso_pre = round(imc_pre * altura ** 2, 1)
    cir = "RYGB" if rng.random() < 0.62 else "Sleeve"
    dm2 = rng.random() < 0.30
    has = rng.random() < (0.35 + 0.006 * (idade - 40))
    dlp = rng.random() < 0.38
    saos = rng.random() < (0.30 if sexo == "F" else 0.50)
    humor = rng.random() < 0.25              # transtorno de humor prévio
    tcap = rng.random() < 0.15               # compulsão alimentar prévia
    tabag = rng.random() < 0.10
    # adesão "latente" à suplementação (BELLA: 69-88% de uso diário)
    adesao = float(np.clip(rng.beta(6, 1.8), 0.05, 1))
    # vulnerabilidade social (insegurança alimentar / barreira de acesso)
    vuln = rng.random() < 0.12
    dist = round(float(rng.lognormal(np.log(25), 0.9)), 1)
    data_cir = date(2025, 3, 3) + timedelta(days=int(rng.integers(0, 590)))
    # status: maioria completou 12 meses; alguns em andamento p/ painel ficar "vivo"
    hoje = date(2026, 11, 18)
    dia_atual = min((hoje - data_cir).days, 365)

    # --- perda de peso: %TWL(t) = TWLmax * (1 - exp(-t/tau))
    twl_max = rng.normal(34.0, 6.5)
    twl_max += 2.0 if cir == "RYGB" else -2.5
    twl_max -= 0.12 * (idade - 43)
    twl_max -= 2.0 if dm2 else 0
    twl_max -= 2.5 if tcap else 0
    twl_max += 4.0 * (adesao - 0.75)
    twl_max = float(np.clip(twl_max, 12, 50))
    tau = float(np.clip(rng.normal(115, 20), 70, 170))

    pac.append(dict(
        paciente_id=pid, sexo=sexo, idade=idade, faixa_etaria=faixa_etaria(idade), uf=rng.choice(UFS, p=UF_P),
        altura_m=altura, peso_pre_kg=peso_pre, imc_pre=round(imc_pre, 1), tipo_cirurgia=cir,
        data_cirurgia=data_cir.isoformat(), dia_pos_atual=dia_atual,
        status="concluido_12m" if dia_atual >= 365 else "em_acompanhamento",
        dm2=dm2, has=has, dislipidemia=dlp, apneia_sono=saos, transtorno_humor_previo=humor,
        compulsao_alimentar_previa=tcap, tabagismo=tabag, vulnerabilidade_social=vuln,
        distancia_centro_km=dist,
        _twl_max=twl_max, _tau=tau, _adesao=adesao,
    ))
    nome = rng.choice(NOMES_F if sexo == "F" else NOMES_M)
    sob = " ".join(rng.choice(SOBRENOMES, 2, replace=False))
    ident.append(dict(
        paciente_id=pid, nome_ficticio=f"{nome} {sob}", prontuario=f"PR-{rng.integers(100000, 999999)}",
        data_nascimento=(date(2025, 1, 1) - timedelta(days=int(idade * 365.25 + rng.integers(0, 365)))).isoformat(),
        email=f"{nome.lower()}.{pid.lower()}@exemplo.invalid", telefone=f"(00) 90000-{k:04d}",
    ))

dfp = pd.DataFrame(pac)

# ---------------------------------------------------------------- pesagens
pes = []
for p in pac:
    for d in DIAS_PESO:
        if d > p["dia_pos_atual"]:
            continue
        if d < 0:   # pré-op: dieta pré-operatória leve
            twl = -rng.normal(1.5, 1.0) if d == -90 else 0.0
        else:
            twl = p["_twl_max"] * (1 - np.exp(-d / p["_tau"]))
        peso = p["peso_pre_kg"] * (1 - twl / 100) + rng.normal(0, 0.7)
        if d == 0:
            peso = p["peso_pre_kg"]
        imc = peso / p["altura_m"] ** 2
        exc = p["peso_pre_kg"] - 25 * p["altura_m"] ** 2
        pes.append(dict(
            paciente_id=p["paciente_id"], dia_pos=d,
            data=(date.fromisoformat(p["data_cirurgia"]) + timedelta(days=d)).isoformat(),
            peso_kg=round(peso, 1), imc=round(imc, 1),
            pct_twl=round((p["peso_pre_kg"] - peso) / p["peso_pre_kg"] * 100, 1),
            pct_ewl=round((p["peso_pre_kg"] - peso) / exc * 100, 1),
            pas_mmHg=int(rng.normal(138 if p["has"] else 124, 10) - 0.25 * max(d, 0) / 30 * (1 if p["has"] else 0.4)),
            pad_mmHg=int(rng.normal(88 if p["has"] else 80, 7) - 0.15 * max(d, 0) / 30),
            fonte="consulta" if d in (-90, 0, 7, 30, 90, 180, 270, 365) else "paciente",
        ))
dfw = pd.DataFrame(pes)

# ---------------------------------------------------------------- questionários (paciente)
qs = []
for p in pac:
    for d in DIAS_QUEST:
        if d > p["dia_pos_atual"]:
            continue
        early = np.exp(-d / 90)
        dor = int(np.clip(rng.poisson(0.8 + 2.5 * early) + (rng.random() < 0.05) * rng.integers(4, 8), 0, 10))
        vom = int(np.clip(rng.poisson(0.3 + 1.3 * early) + (rng.random() < 0.05) * rng.integers(3, 8), 0, 14))
        dumping = bool(p["tipo_cirurgia"] == "RYGB" and rng.random() < 0.12)
        adere = bool(rng.random() < p["_adesao"] - 0.002 * d / 6)
        phq2 = int(np.clip(rng.poisson(0.45 + (1.0 if p["transtorno_humor_previo"] else 0)
                                        + (0.4 if d > 200 else 0)), 0, 6))
        compuls = bool(rng.random() < (0.02 + (0.12 if p["compulsao_alimentar_previa"] else 0) + 0.0003 * d))
        qs.append(dict(
            paciente_id=p["paciente_id"], dia_pos=d,
            data=(date.fromisoformat(p["data_cirurgia"]) + timedelta(days=d)).isoformat(),
            dor_eva_0a10=dor, vomitos_semana=vom, sintomas_dumping=dumping,
            hidratacao_ml_dia=int(np.clip(rng.normal(1700 - 400 * early, 300), 500, 3000)),
            proteina_meta_atingida=bool(rng.random() < 0.55 + 0.3 * (1 - early)),
            uso_diario_suplementos=adere,
            phq2_0a6=phq2, episodio_compulsao=compuls,
            alcool_doses_semana=int(rng.poisson(0.4 + 0.004 * d)),
            exercicio_min_semana=int(np.clip(rng.normal(60 + 0.4 * d, 50), 0, 400)),
            qualidade_vida_0a100=int(np.clip(rng.normal(55 + 0.05 * d - 4 * (phq2 >= 3), 10), 10, 100)),
        ))
dfq = pd.DataFrame(qs)

# ---------------------------------------------------------------- exames (laboratório)
ex = []
for p in pac:
    f = p["sexo"] == "F"
    rygb = p["tipo_cirurgia"] == "RYGB"
    for d in DIAS_EXAME:
        if d > p["dia_pos_atual"]:
            continue
        t = max(d, 0) / 365
        a = p["_adesao"]
        vitd = rng.normal(22 + 5 * a - 2 * t, 7)            # ~30% < 20 ng/mL aos 12m
        b12 = rng.normal(480 - (180 if rygb else 70) * t * (1.3 - a), 130)
        ferr = rng.lognormal(np.log((70 if f else 150) * (1 - (0.45 if rygb else 0.2) * t * (1.3 - a))), 0.6)
        hb = rng.normal((13.2 if f else 14.8) - (0.8 if rygb else 0.3) * t * (1.3 - a), 0.9)
        alb = rng.normal(4.2 - 0.15 * t, 0.3)
        hba1c = rng.normal(7.6 if p["dm2"] else 5.6, 0.7 if p["dm2"] else 0.3) - (1.4 if p["dm2"] else 0.3) * min(t * 1.5, 1)
        glic = 18 * hba1c - 10 + rng.normal(0, 8)
        ldl = rng.normal(130 if p["dislipidemia"] else 108, 25) - 15 * t
        hdl = rng.normal(42 if not f else 48, 8) + 6 * t
        tg = rng.lognormal(np.log((190 if p["dislipidemia"] else 140) * (1 - 0.3 * t)), 0.3)
        ex.append(dict(
            paciente_id=p["paciente_id"], dia_pos=d,
            data_coleta=(date.fromisoformat(p["data_cirurgia"]) + timedelta(days=d)).isoformat(),
            hemoglobina_g_dl=round(hb, 1), ferritina_ng_ml=round(ferr, 0),
            vitamina_d_ng_ml=round(max(vitd, 4), 1), vitamina_b12_pg_ml=round(max(b12, 90), 0),
            folato_ng_ml=round(max(rng.normal(9.5, 3.5), 1.5), 1), tiamina_b1_nmol_l=round(max(rng.normal(130, 30), 50), 0),
            zinco_ug_dl=round(max(rng.normal(85 - 6 * t, 14), 40), 0), calcio_mg_dl=round(rng.normal(9.4, 0.4), 1),
            pth_pg_ml=round(max(rng.normal(48 + (25 - vitd) * 1.2, 15), 10), 0), albumina_g_dl=round(alb, 2),
            glicemia_mg_dl=round(glic, 0), hba1c_pct=round(hba1c, 1),
            ldl_mg_dl=round(ldl, 0), hdl_mg_dl=round(hdl, 0), triglicerides_mg_dl=round(tg, 0),
            status_laudo="liberado", liberado_por="analista_lab",
        ))
dfe = pd.DataFrame(ex)

# ---------------------------------------------------------------- alertas (regras)
# cada regra -> módulo responsável (tabela da proposta)
REGRAS = []
al = []


def alerta(pid, d, data, modulo, resp, sev, regra, valor):
    al.append(dict(paciente_id=pid, dia_pos=d, data=data, modulo=modulo, responsavel=resp,
                   severidade=sev, regra=regra, valor=valor))


for r in dfq.itertuples():
    if r.dor_eva_0a10 > 5:
        alerta(r.paciente_id, r.dia_pos, r.data, "Recuperação cirúrgica", "enfermagem", "alta",
               "Dor EVA > 5 (critério BELLA)", r.dor_eva_0a10)
    if r.vomitos_semana >= 3:
        alerta(r.paciente_id, r.dia_pos, r.data, "Recuperação cirúrgica", "enfermagem", "alta" if r.vomitos_semana >= 6 else "media",
               "Vômitos >= 3/semana (risco de desidratação/def. tiamina)", r.vomitos_semana)
    if r.hidratacao_ml_dia < 1000:
        alerta(r.paciente_id, r.dia_pos, r.data, "Nutricional", "nutricionista", "media", "Hidratação < 1000 mL/dia", r.hidratacao_ml_dia)
    if r.phq2_0a6 >= 3:
        alerta(r.paciente_id, r.dia_pos, r.data, "Emocional e comportamental", "psicologo", "alta",
               "PHQ-2 >= 3 (rastreio positivo para depressão)", r.phq2_0a6)
    if r.alcool_doses_semana >= 7:
        alerta(r.paciente_id, r.dia_pos, r.data, "Emocional e comportamental", "psicologo", "media",
               "Álcool >= 7 doses/semana (transferência de adicção)", r.alcool_doses_semana)
    if r.episodio_compulsao:
        alerta(r.paciente_id, r.dia_pos, r.data, "Emocional e comportamental", "psicologo", "baixa", "Episódio de compulsão relatado", 1)

dfq["_sem_sup_2x"] = (~dfq.uso_diario_suplementos) & (~dfq.groupby("paciente_id").uso_diario_suplementos.shift(1, fill_value=True))
for r in dfq[dfq._sem_sup_2x].itertuples():
    alerta(r.paciente_id, r.dia_pos, r.data, "Nutricional", "nutricionista", "media",
           "Sem suplementação diária em 2 questionários seguidos", 0)
dfq = dfq.drop(columns="_sem_sup_2x")

LIMITES = [  # coluna, op, limite, módulo, responsável, severidade, descrição
    ("vitamina_d_ng_ml", "<", 20, "Nutricional", "nutricionista", "media", "Vitamina D < 20 ng/mL"),
    ("vitamina_b12_pg_ml", "<", 200, "Nutricional", "nutrologo", "media", "B12 < 200 pg/mL"),
    ("hemoglobina_g_dl", "<", 11.5, "Nutricional", "nutrologo", "media", "Anemia (Hb < 11,5)"),
    ("albumina_g_dl", "<", 3.5, "Nutricional", "nutrologo", "alta", "Albumina < 3,5 g/dL (desnutrição proteica)"),
    ("tiamina_b1_nmol_l", "<", 70, "Nutricional", "nutrologo", "alta", "Tiamina baixa"),
    ("hba1c_pct", ">=", 7.0, "Metabólico", "endocrinologista", "media", "HbA1c >= 7%"),
    ("glicemia_mg_dl", "<", 60, "Metabólico", "endocrinologista", "alta", "Hipoglicemia"),
]
for r in dfe[dfe.dia_pos > 0].itertuples():
    for col, op, lim, mod, resp, sev, desc in LIMITES:
        v = getattr(r, col)
        if (op == "<" and v < lim) or (op == ">=" and v >= lim):
            alerta(r.paciente_id, r.dia_pos, r.data_coleta, mod, resp, sev, desc, v)
    if r.ferritina_ng_ml < 15:
        alerta(r.paciente_id, r.dia_pos, r.data_coleta, "Nutricional", "nutrologo", "media", "Ferritina < 15 ng/mL", r.ferritina_ng_ml)

for p in pac:
    if p["vulnerabilidade_social"]:
        alerta(p["paciente_id"], 0, p["data_cirurgia"], "Apoio social", "assistente_social", "media",
               "Insegurança alimentar / barreira de acesso relatada no pré-op", 1)

dfa = pd.DataFrame(al)
dfa.insert(0, "alerta_id", [f"A{i + 1:05d}" for i in range(len(dfa))])
# status: alertas antigos resolvidos, recentes pendentes
cur = dfp.set_index("paciente_id").dia_pos_atual
recente = dfa.apply(lambda r: cur[r.paciente_id] - r.dia_pos <= 45, axis=1)
dfa["status"] = np.where(recente, np.where(rng.random(len(dfa)) < 0.6, "pendente", "em_analise"), "resolvido")

# ---------------------------------------------------------------- salvar
pub = dfp.drop(columns=[c for c in dfp.columns if c.startswith("_")])
pub.to_csv(OUT / "pacientes.csv", index=False)
pd.DataFrame(ident).to_csv(OUT / "identificadores_RESTRITO.csv", index=False)
dfw.to_csv(OUT / "pesagens.csv", index=False)
dfq.to_csv(OUT / "questionarios_paciente.csv", index=False)
dfe.to_csv(OUT / "exames.csv", index=False)
dfa.to_csv(OUT / "alertas.csv", index=False)

# JSON único para o front consumir sem backend (sem identificadores!)
bundle = dict(
    gerado_em=date.today().isoformat(), semente=SEED, aviso="DADOS SINTÉTICOS - nenhum paciente real",
    pacientes=pub.to_dict("records"), pesagens=dfw.to_dict("records"),
    questionarios=dfq.to_dict("records"), exames=dfe.to_dict("records"), alertas=dfa.to_dict("records"),
)
(OUT / "base_sintetica.json").write_text(json.dumps(bundle, ensure_ascii=False, default=str))
print(f"{len(pub)} pacientes | {len(dfw)} pesagens | {len(dfq)} questionários | {len(dfe)} exames | {len(dfa)} alertas")
