"""
Previsão de perda de peso em 12 meses (%TWL) + curvas de referência.

Gera ./dados/modelo_previsao.json, que o front usa SEM backend:
  - modelo "pre_op": prevê %TWL aos 12 meses só com dados do pré-operatório
  - modelo "precoce": idem + %TWL observado aos 30 e 90 dias (bem mais preciso)
  - curvas_referencia: percentis p10/p25/p50/p75/p90 de %TWL por dia e por cirurgia
  - formula da trajetória: TWL(t) = TWL12 * (1 - e^(-t/tau)) / (1 - e^(-365/tau))

Regressão linear de propósito: dá para explicar na banca e rodar em 5 linhas de JS.
ATENÇÃO: treinado em dados sintéticos -> serve para demonstrar o pipeline, não para uso clínico.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_predict

import subprocess, sys
D = Path(__file__).parent / "dados"
H = Path(__file__).parent / "dados_historico_treino"
# coorte histórica (outra semente) só para treino; o app usa ./dados
if not (H / "pesagens.csv").exists():
    subprocess.run([sys.executable, str(Path(__file__).parent / "gerar_dados.py"), "2500", "7", str(H)], check=True)
p = pd.read_csv(H / "pacientes.csv")
w = pd.read_csv(H / "pesagens.csv")

piv = w.pivot_table(index="paciente_id", columns="dia_pos", values="pct_twl")
df = p.set_index("paciente_id").join(piv[[30, 90, 365]].rename(columns=lambda c: f"twl_d{c}"))
df = df[df.twl_d365.notna()].copy()
df["rygb"] = (df.tipo_cirurgia == "RYGB").astype(int)
df["masculino"] = (df.sexo == "M").astype(int)
for c in ["dm2", "has", "compulsao_alimentar_previa", "transtorno_humor_previo", "tabagismo"]:
    df[c] = df[c].astype(int)

FEAT_PRE = ["idade", "masculino", "imc_pre", "rygb", "dm2", "has", "compulsao_alimentar_previa",
            "transtorno_humor_previo", "tabagismo"]
FEAT_PREC = FEAT_PRE + ["twl_d30", "twl_d90"]
y = df.twl_d365.values


def ajusta(feats, nome):
    X = df[feats].values
    cv = cross_val_predict(LinearRegression(), X, y, cv=KFold(5, shuffle=True, random_state=0))
    mae = float(np.mean(np.abs(cv - y)))
    r2 = float(1 - np.sum((cv - y) ** 2) / np.sum((y - y.mean()) ** 2))
    m = LinearRegression().fit(X, y)
    sd = float(np.std(y - cv, ddof=1))
    print(f"{nome:8s}  n={len(y)}  MAE(CV)={mae:.2f} p.p.  R2(CV)={r2:.2f}  IC80=±{1.28 * sd:.1f}")
    return dict(intercepto=round(float(m.intercept_), 4),
                coeficientes={f: round(float(c), 4) for f, c in zip(feats, m.coef_)},
                desvio_residual=round(sd, 3), mae_cv=round(mae, 2), r2_cv=round(r2, 3), n_treino=int(len(y)))


modelos = {"pre_op": ajusta(FEAT_PRE, "pre_op"), "precoce": ajusta(FEAT_PREC, "precoce")}

# tau médio da curva exponencial (ajuste global)
pos = w[w.dia_pos > 0].merge(df[["twl_d365"]], left_on="paciente_id", right_index=True)
f = lambda t, tau: (1 - np.exp(-t / tau)) / (1 - np.exp(-365 / tau))
tau, _ = curve_fit(lambda t, tau: f(t, tau), pos.dia_pos, pos.pct_twl / pos.twl_d365, p0=[100])
tau = round(float(tau[0]), 1)
print("tau =", tau, "dias")

# validação externa: aplica nos pacientes concluídos da base do app (./dados)
pa, wa = pd.read_csv(D / "pacientes.csv"), pd.read_csv(D / "pesagens.csv")
va = pa.set_index("paciente_id").join(wa.pivot_table(index="paciente_id", columns="dia_pos", values="pct_twl")[[30, 90, 365]]
                                      .rename(columns=lambda c: f"twl_d{c}"))
va = va[va.twl_d365.notna()].copy()
va["rygb"] = (va.tipo_cirurgia == "RYGB").astype(int); va["masculino"] = (va.sexo == "M").astype(int)
for nome, m in modelos.items():
    pr = m["intercepto"] + sum(c * va[k].astype(float) for k, c in m["coeficientes"].items())
    m["mae_validacao_externa"] = round(float(np.mean(np.abs(pr - va.twl_d365))), 2)
    print(f"{nome:8s}  validação externa (base do app, n={len(va)}): MAE={m['mae_validacao_externa']:.2f} p.p.")

# curvas de referência (coorte histórica)
wp = w[w.dia_pos >= 0].merge(p[["paciente_id", "tipo_cirurgia"]])
curvas = {}
for cir, g in wp.groupby("tipo_cirurgia"):
    q = g.groupby("dia_pos").pct_twl.quantile([.1, .25, .5, .75, .9]).unstack()
    curvas[cir] = [dict(dia=int(d), **{f"p{int(k * 100)}": round(float(v), 1) for k, v in r.items()})
                   for d, r in q.iterrows()]

out = dict(
    aviso="Modelo treinado em dados sintéticos. Demonstração - não usar para decisão clínica.",
    alvo="pct_twl aos 365 dias",
    tau_dias=tau,
    formula_trajetoria="twl(t) = twl12 * (1 - exp(-t/tau)) / (1 - exp(-365/tau))",
    regra_alerta="se %TWL observado < p10 da curva da cirurgia no mesmo dia -> alerta 'perda abaixo do esperado' (nutrição + endocrino)",
    modelos=modelos,
    curvas_referencia=curvas,
)
(D / "modelo_previsao.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))

# exemplo de uso (o mesmo cálculo que o front faz)
df = va; ex = df.iloc[0]
m = modelos["precoce"]
pred = m["intercepto"] + sum(c * float(ex[k]) for k, c in m["coeficientes"].items())
print(f"exemplo {df.index[0]}: previsto {pred:.1f}% | real {ex.twl_d365:.1f}%")
