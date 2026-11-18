// permissoes.ts — quem vê e quem edita cada módulo (sem login, perfil escolhido na tela inicial)
// Os nomes de módulo e de papel batem com a coluna "modulo" e "responsavel" do alertas.csv.

export type Papel =
  | "cirurgiao"
  | "enfermagem"
  | "endocrinologista"
  | "clinico"
  | "nutricionista"
  | "nutrologo"
  | "psicologo"
  | "psiquiatra"
  | "fisioterapeuta"
  | "educacao_fisica"
  | "farmaceutico"
  | "assistente_social"
  | "laboratorio"
  | "coordenador"
  | "paciente";

export type Modulo =
  | "Recuperação cirúrgica"
  | "Metabólico"
  | "Nutricional"
  | "Emocional e comportamental"
  | "Atividade física"
  | "Medicamentos"
  | "Apoio social"
  | "Coordenação"
  | "Laboratório";

export const MODULOS: Modulo[] = [
  "Recuperação cirúrgica",
  "Metabólico",
  "Nutricional",
  "Emocional e comportamental",
  "Atividade física",
  "Medicamentos",
  "Apoio social",
  "Coordenação",
  "Laboratório",
];

// Rótulos para a tela de escolha de perfil
export const PAPEIS: { id: Papel; nome: string }[] = [
  { id: "cirurgiao", nome: "Cirurgião bariátrico" },
  { id: "enfermagem", nome: "Enfermagem" },
  { id: "endocrinologista", nome: "Endocrinologista / Metabologista" },
  { id: "clinico", nome: "Clínico" },
  { id: "nutricionista", nome: "Nutricionista" },
  { id: "nutrologo", nome: "Nutrólogo" },
  { id: "psicologo", nome: "Psicólogo" },
  { id: "psiquiatra", nome: "Psiquiatra" },
  { id: "fisioterapeuta", nome: "Fisioterapeuta" },
  { id: "educacao_fisica", nome: "Educação Física / Fisiologista do exercício" },
  { id: "farmaceutico", nome: "Farmacêutico clínico" },
  { id: "assistente_social", nome: "Assistente social" },
  { id: "laboratorio", nome: "Laboratório (Biomédico / Analista)" },
  { id: "coordenador", nome: "Coordenador do programa" },
  { id: "paciente", nome: "Paciente" },
];

// Quem EDITA cada módulo (tabela de módulos da proposta)
const EDITA: Record<Modulo, Papel[]> = {
  "Recuperação cirúrgica": ["cirurgiao", "enfermagem"],
  "Metabólico": ["endocrinologista", "clinico"],
  "Nutricional": ["nutricionista", "nutrologo"],
  "Emocional e comportamental": ["psicologo", "psiquiatra"],
  "Atividade física": ["fisioterapeuta", "educacao_fisica"],
  "Medicamentos": ["cirurgiao", "endocrinologista", "clinico", "nutrologo", "psiquiatra", "farmaceutico"],
  "Apoio social": ["assistente_social"],
  "Coordenação": ["coordenador"],
  "Laboratório": ["laboratorio"],
};

// Módulos com leitura restrita (dado sensível): só quem edita + coordenador
const LEITURA_RESTRITA: Modulo[] = ["Emocional e comportamental"];

// Laboratório só precisa ver o próprio módulo
const SO_O_PROPRIO: Papel[] = ["laboratorio"];

export function podeEditar(papel: Papel, modulo: Modulo): boolean {
  return EDITA[modulo].includes(papel);
}

export function podeVer(papel: Papel, modulo: Modulo): boolean {
  if (papel === "paciente") return false; // paciente usa a "área do paciente", não os módulos
  if (papel === "coordenador") return true;
  if (SO_O_PROPRIO.includes(papel)) return podeEditar(papel, modulo);
  if (LEITURA_RESTRITA.includes(modulo)) return podeEditar(papel, modulo);
  return true;
}

export function modulosVisiveis(papel: Papel): Modulo[] {
  return MODULOS.filter((m) => podeVer(papel, m));
}

export function quemEdita(modulo: Modulo): Papel[] {
  return EDITA[modulo];
}

// Fila de alertas: cada um vê os seus; coordenador vê todos
export function filtrarAlertas<T extends { responsavel: string }>(papel: Papel, alertas: T[]): T[] {
  if (papel === "coordenador") return alertas;
  if (papel === "paciente") return [];
  // médico do módulo também enxerga alertas atribuídos ao colega de módulo
  const meusModulos = MODULOS.filter((m) => podeEditar(papel, m));
  const colegas = new Set(meusModulos.flatMap((m) => EDITA[m]));
  return alertas.filter((a) => colegas.has(a.responsavel as Papel));
}

// Sessão escolhida na tela inicial (guarde em useState/Context)
export type Sessao = { papel: Papel; pacienteId?: string }; // pacienteId só no perfil paciente

// Paciente só abre o próprio prontuário; profissionais abrem qualquer um
export function podeAbrirPaciente(sessao: Sessao, pacienteId: string): boolean {
  if (sessao.papel === "paciente") return sessao.pacienteId === pacienteId;
  if (sessao.papel === "laboratorio") return true; // precisa achar o paciente para liberar exame
  return true;
}

// Nome e contato (identificadores) só para o coordenador
export function podeVerIdentificacao(papel: Papel): boolean {
  return papel === "coordenador";
}

/* Exemplo de uso num componente:

   const { papel } = useSessao();
   {modulosVisiveis(papel).map((m) => (
     <CardModulo key={m} modulo={m} editavel={podeEditar(papel, m)} />
   ))}

   // dentro do card:
   {editavel ? <button>Editar</button> : <span>Somente leitura · edita: {quemEdita(modulo).join(", ")}</span>}
*/
