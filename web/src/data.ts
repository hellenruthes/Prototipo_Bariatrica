import base from "../../dados/base_sintetica.json";
import modelo from "../../dados/modelo_previsao.json";
import type { Alerta, Exame, Paciente, Pesagem, Questionario } from "./types";

export const HOJE = "2026-11-18"; // "hoje" da base sintética
export const BASE = base as unknown as {
  pacientes: Paciente[]; pesagens: Pesagem[]; questionarios: Questionario[]; exames: Exame[]; alertas: Alerta[];
};
export const MODELO = modelo as any;

export const pacientePorId = new Map(BASE.pacientes.map((p) => [p.paciente_id, p]));

function agrupa<T extends { paciente_id: string }>(rows: T[]) {
  const m = new Map<string, T[]>();
  for (const r of rows) (m.get(r.paciente_id) ?? m.set(r.paciente_id, []).get(r.paciente_id)!).push(r);
  return m;
}
export const pesagensPorPac = agrupa(BASE.pesagens);
export const examesBase = agrupa(BASE.exames);
export const questBase = agrupa(BASE.questionarios);

/** Supressão de grupos pequenos (LGPD): n < 5 não aparece. */
export const N_MIN = 5;
export const suprime = (n: number) => n < N_MIN;

// Nome e contato FICTÍCIOS, gerados no navegador só para a demo do perfil Coordenador.
// (os identificadores reais do schema `restrito` nunca vão para o front)
const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Irene", "João", "Karina", "Lucas", "Marta", "Nuno", "Olívia", "Paulo"];
const SOBRENOMES = ["Almeida", "Barros", "Cardoso", "Duarte", "Esteves", "Farias", "Gomes", "Henrique", "Ibrahim", "Junqueira", "Lima", "Moraes"];
export function identificacaoFicticia(id: string) {
  const n = parseInt(id.replace(/\D/g, ""), 10);
  return {
    nome: `${NOMES[n % NOMES.length]} ${SOBRENOMES[(n * 7) % SOBRENOMES.length]} (fictício)`,
    email: `${id.toLowerCase()}@exemplo.invalid`,
    telefone: `(00) 90000-${String(n).padStart(4, "0")}`,
  };
}
