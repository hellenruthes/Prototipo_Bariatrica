import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BASE, N_MIN, examesBase, suprime } from "./data";
import { MODULOS } from "./permissoes";
import { useStore } from "./store";
import { Card, Cor, Kpi, fmt } from "./ui";

const media = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

export function Dashboard() {
  const { alertas } = useStore();
  const P = BASE.pacientes;
  const abertos = alertas.filter((a) => a.status !== "resolvido");
  const concl = new Map(BASE.pesagens.filter((x) => x.dia_pos === 365).map((x) => [x.paciente_id, x.pct_twl]));

  const porModulo = MODULOS.map((m) => ({
    modulo: m.replace("Emocional e comportamental", "Emocional").replace("Recuperação cirúrgica", "Recup. cirúrgica"),
    pendente: alertas.filter((a) => a.modulo === m && a.status === "pendente").length,
    em_analise: alertas.filter((a) => a.modulo === m && a.status === "em_analise").length,
    resolvido: alertas.filter((a) => a.modulo === m && a.status === "resolvido").length,
  })).filter((r) => r.pendente + r.em_analise + r.resolvido > 0);

  const tipo = (id: string) => P.find((p) => p.paciente_id === id)!.tipo_cirurgia;
  const dias = [...new Set(BASE.pesagens.filter((x) => x.dia_pos >= 0).map((x) => x.dia_pos))].sort((a, b) => a - b);
  const perda = dias.map((d) => {
    const linha: Record<string, number | undefined> = { dia: d };
    for (const t of ["RYGB", "Sleeve"]) {
      const v = BASE.pesagens.filter((x) => x.dia_pos === d && tipo(x.paciente_id) === t).map((x) => x.pct_twl);
      linha[t] = suprime(v.length) ? undefined : +media(v).toFixed(1);
    }
    return linha;
  });

  const defs: [string, (e: any) => boolean][] = [["Vitamina D < 20", (e) => e.vitamina_d_ng_ml < 20], ["B12 < 200", (e) => e.vitamina_b12_pg_ml < 200], ["Anemia (Hb < 11,5)", (e) => e.hemoglobina_g_dl < 11.5], ["Ferritina < 15", (e) => e.ferritina_ng_ml < 15], ["Albumina < 3,5", (e) => e.albumina_g_dl < 3.5]];
  const ex12 = [...examesBase.values()].flat().filter((e) => e.dia_pos === 365);
  const deficiencias = defs.map(([nome, f]) => {
    const linha: Record<string, number | string | undefined> = { nome };
    for (const t of ["RYGB", "Sleeve"]) {
      const g = ex12.filter((e) => tipo(e.paciente_id) === t);
      linha[t] = suprime(g.length) ? undefined : +((100 * g.filter(f).length) / g.length).toFixed(1);
    }
    return linha;
  });

  const ufs = [...new Set(P.map((p) => p.uf))].sort().map((uf) => ({ uf, n: P.filter((p) => p.uf === uf).length, vuln: P.filter((p) => p.uf === uf && p.vulnerabilidade_social).length }));
  const twlMedio = media([...concl.values()]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pacientes" value={P.length} sub={`${P.filter((p) => p.status === "em_acompanhamento").length} em acompanhamento`} />
        <Kpi label="Alertas abertos" value={abertos.length} sub={`${abertos.filter((a) => a.severidade === "alta").length} de severidade alta`} />
        <Kpi label="%TWL médio aos 12 meses" value={`${fmt(twlMedio)}%`} sub={`n = ${concl.size} concluídos`} />
        <Kpi label="Questionários respondidos" value={BASE.questionarios.length} sub="ao vivo: cresce quando o paciente responde" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Alertas por módulo e status">
          <ResponsiveContainer width="100%" height={300}><BarChart data={porModulo} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="modulo" width={110} fontSize={12} /><Tooltip /><Legend />
            <Bar dataKey="pendente" stackId="a" fill="#dc2626" /><Bar dataKey="em_analise" name="em análise" stackId="a" fill="#f59e0b" /><Bar dataKey="resolvido" stackId="a" fill="#94a3b8" />
          </BarChart></ResponsiveContainer>
        </Card>
        <Card title="Perda média de peso: RYGB × Sleeve (%TWL)">
          <ResponsiveContainer width="100%" height={300}><LineChart data={perda}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="dia" type="number" domain={[0, 365]} /><YAxis unit="%" /><Tooltip /><Legend />
            <Line isAnimationActive={false} dataKey="RYGB" stroke={Cor.rygb} strokeWidth={2} dot={false} connectNulls /><Line isAnimationActive={false} dataKey="Sleeve" stroke={Cor.sleeve} strokeWidth={2} dot={false} connectNulls />
          </LineChart></ResponsiveContainer>
        </Card>
        <Card title="Deficiências aos 12 meses (% dos concluídos)">
          <ResponsiveContainer width="100%" height={300}><BarChart data={deficiencias}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="nome" fontSize={11} /><YAxis unit="%" /><Tooltip /><Legend />
            <Bar dataKey="RYGB" fill={Cor.rygb} /><Bar dataKey="Sleeve" fill={Cor.sleeve} />
          </BarChart></ResponsiveContainer>
        </Card>
        <Card title="Vulnerabilidade social por UF · LGPD: grupos < 5 suprimidos">
          <table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th>UF</th><th>Pacientes</th><th>Com vulnerabilidade</th></tr></thead><tbody>
            {ufs.map((u) => <tr key={u.uf} className="border-t border-slate-100"><td className="py-0.5">{u.uf}</td><td>{suprime(u.n) ? `< ${N_MIN}` : u.n}</td><td>{suprime(u.n) || suprime(u.vuln) ? `< ${N_MIN}` : u.vuln}</td></tr>)}
          </tbody></table>
        </Card>
      </div>
    </div>
  );
}
