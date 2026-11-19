import { useState } from "react";
import { Alertas } from "./Alertas";
import { AreaPaciente } from "./AreaPaciente";
import { Auditoria } from "./Auditoria";
import { Dashboard } from "./Dashboard";
import { Entrada } from "./Entrada";
import { Pacientes } from "./Pacientes";
import { PAPEIS, podeAbrirPaciente, podeVerIdentificacao } from "./permissoes";
import { Prontuario } from "./Prontuario";
import { StoreProvider, useStore } from "./store";
import { Btn } from "./ui";

type Tela = "pacientes" | "alertas" | "dashboard" | "auditoria";

function Shell() {
  const { sessao, setSessao, reiniciar } = useStore();
  const [tela, setTela] = useState<Tela>("pacientes");
  const [aberto, setAberto] = useState<string | null>(null);
  if (!sessao) return <Entrada />;

  const nome = PAPEIS.find((p) => p.id === sessao.papel)?.nome;
  const coord = podeVerIdentificacao(sessao.papel);
  const abas: [Tela, string][] = sessao.papel === "paciente" ? [] : [["pacientes", "Pacientes"], ["alertas", "Alertas"], ...(coord ? ([["dashboard", "Dashboard"], ["auditoria", "Registro de alterações"]] as [Tela, string][]) : [])];
  const abrir = (id: string) => podeAbrirPaciente(sessao, id) && setAberto(id);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 font-semibold text-teal-900">Pós-bariátrica · demo</h1>
        {abas.map(([k, l]) => <button key={k} onClick={() => { setTela(k); setAberto(null); }} className={`rounded-lg px-3 py-1.5 text-sm ${tela === k && !aberto ? "bg-teal-700 text-white" : "bg-white ring-1 ring-slate-200"}`}>{l}</button>)}
        <span className="ml-auto text-sm text-slate-600">{nome}{sessao.pacienteId ? ` · ${sessao.pacienteId}` : ""}</span>
        <Btn kind="ghost" onClick={reiniciar}>Reiniciar demo</Btn>
        <Btn kind="ghost" onClick={() => { setSessao(null); setAberto(null); setTela("pacientes"); }}>Trocar perfil</Btn>
      </header>
      {sessao.papel === "paciente" ? <AreaPaciente id={sessao.pacienteId!} />
        : aberto ? <Prontuario id={aberto} voltar={() => setAberto(null)} />
        : tela === "pacientes" ? <Pacientes abrir={abrir} />
        : tela === "alertas" ? <Alertas abrir={abrir} />
        : tela === "dashboard" ? <Dashboard /> : <Auditoria />}
      <footer className="pt-4 text-center text-xs text-slate-400">Dados sintéticos · modelo de demonstração · sem login nem controle no servidor (próximos passos)</footer>
    </div>
  );
}
export default function App() { return <StoreProvider><Shell /></StoreProvider>; }
