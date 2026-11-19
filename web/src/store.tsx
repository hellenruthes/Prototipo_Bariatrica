import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BASE, HOJE, examesBase, pacientePorId, questBase } from "./data";
import { alertasDoExame, alertasDoQuestionario } from "./rules";
import type { Alerta, Auditoria, Exame, Questionario, StatusAlerta } from "./types";
import type { Modulo, Sessao } from "./permissoes";

// Tudo que se faz na demo fica nesta "camada de alterações" por cima da base mocada
// (guardada no localStorage; o botão "Reiniciar demo" limpa).
type Overlay = {
  status: Record<string, StatusAlerta>;
  alertasNovos: Alerta[];
  examesNovos: Exame[];
  questNovos: Questionario[];
  registros: Record<string, { texto: string; por: string; em: string }>;
  audit: Auditoria[];
};
const VAZIO: Overlay = { status: {}, alertasNovos: [], examesNovos: [], questNovos: [], registros: {}, audit: [] };
const CHAVE = "demo-bariatrica-v1";

function carrega(): Overlay {
  try { return { ...VAZIO, ...JSON.parse(localStorage.getItem(CHAVE) ?? "{}") }; } catch { return VAZIO; }
}

type Ctx = {
  sessao: Sessao | null; setSessao: (s: Sessao | null) => void;
  alertas: Alerta[]; audit: Auditoria[];
  exames: (id: string) => Exame[]; questionarios: (id: string) => Questionario[];
  registro: (id: string, m: Modulo) => Overlay["registros"][string] | undefined;
  mudarStatus: (id: string, s: StatusAlerta) => void;
  /** devolve quantos alertas o exame gerou */
  liberarExame: (e: Exame) => number;
  /** devolve quantos alertas o questionário gerou */
  enviarQuestionario: (q: Questionario) => number;
  salvarRegistro: (id: string, m: Modulo, texto: string) => void;
  reiniciar: () => void;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(C);

const agora = () => new Date().toLocaleString("pt-BR");

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [o, setO] = useState<Overlay>(carrega);
  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch { /* sem storage: segue em memória */ } }, [o]);

  const value = useMemo<Ctx>(() => {
    const quem = sessao ? (sessao.papel === "paciente" ? `paciente ${sessao.pacienteId}` : sessao.papel) : "—";
    const aplica = (a: Alerta) => (o.status[a.alerta_id] ? { ...a, status: o.status[a.alerta_id] } : a);
    const alertas = [...BASE.alertas, ...o.alertasNovos].map(aplica);
    const exames = (id: string) => [...(examesBase.get(id) ?? []), ...o.examesNovos.filter((e) => e.paciente_id === id)];
    const questionarios = (id: string) => [...(questBase.get(id) ?? []), ...o.questNovos.filter((q) => q.paciente_id === id)];

    // o "trigger" da demo: toda gravação registra quem fez
    const log = (ov: Overlay, tabela: string, acao: string, paciente_id: string, detalhe: string): Overlay => ({
      ...ov, audit: [{ id: ov.audit.length + 1, quando: agora(), perfil: quem, tabela, acao, paciente_id, detalhe }, ...ov.audit],
    });

    function comAlertas(ov: Overlay, pid: string, regras: ReturnType<typeof alertasDoExame>): Overlay {
      const p = pacientePorId.get(pid)!;
      let r = ov;
      for (const n of regras) {
        const alerta: Alerta = {
          ...n, alerta_id: "A" + String(BASE.alertas.length + r.alertasNovos.length + 1).padStart(5, "0"),
          paciente_id: pid, dia_pos: p.dia_pos_atual, data: HOJE, status: "pendente",
        };
        r = log({ ...r, alertasNovos: [...r.alertasNovos, alerta] }, "alertas", "INSERT", pid, `${n.regra} → ${n.responsavel}`);
      }
      return r;
    }

    return {
      sessao, setSessao, alertas, audit: o.audit, exames, questionarios,
      registro: (id, m) => o.registros[`${id}|${m}`],
      mudarStatus: (id, s) => {
        const pid = alertas.find((a) => a.alerta_id === id)?.paciente_id ?? "";
        setO((ov) => log({ ...ov, status: { ...ov.status, [id]: s } }, "alertas", "UPDATE", pid, `${id} → ${s}`));
      },
      liberarExame: (e) => {
        const regras = alertasDoExame(e);
        setO((ov) => comAlertas(log({ ...ov, examesNovos: [...ov.examesNovos, e] }, "exames", "INSERT", e.paciente_id, "laudo liberado"), e.paciente_id, regras));
        return regras.length;
      },
      enviarQuestionario: (q) => {
        const anterior = questionarios(q.paciente_id).sort((a, b) => b.dia_pos - a.dia_pos)[0];
        const regras = alertasDoQuestionario(q, anterior);
        setO((ov) => comAlertas(log({ ...ov, questNovos: [...ov.questNovos, q] }, "questionarios", "INSERT", q.paciente_id, "questionário respondido"), q.paciente_id, regras));
        return regras.length;
      },
      salvarRegistro: (id, m, texto) =>
        setO((ov) => log({ ...ov, registros: { ...ov.registros, [`${id}|${m}`]: { texto, por: quem, em: agora() } } }, "modulos", "UPSERT", id, m)),
      reiniciar: () => setO(VAZIO),
    };
  }, [o, sessao]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
