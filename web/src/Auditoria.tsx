import { useStore } from "./store";
import { Card } from "./ui";

export function Auditoria() {
  const { audit } = useStore();
  return (
    <Card title="Registro de alterações (audit_log)">
      <p className="mb-2 text-xs text-slate-500">Toda mudança em alertas, exames, questionários e módulos grava quem fez, quando e o quê. Faça uma ação em outro perfil e volte aqui.</p>
      <table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-1">Quando</th><th>Perfil</th><th>Tabela</th><th>Ação</th><th>Paciente</th><th>Detalhe</th></tr></thead><tbody>
        {audit.map((a) => <tr key={a.id} className="border-t border-slate-100"><td className="p-1 whitespace-nowrap">{a.quando}</td><td>{a.perfil}</td><td>{a.tabela}</td><td>{a.acao}</td><td>{a.paciente_id}</td><td>{a.detalhe}</td></tr>)}
        {!audit.length && <tr><td colSpan={6} className="py-6 text-center text-slate-500">Nenhuma alteração ainda.</td></tr>}
      </tbody></table>
    </Card>
  );
}
