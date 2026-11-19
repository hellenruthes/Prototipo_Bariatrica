# web — demo (sem API)

Front React + Vite + TypeScript + Tailwind + Recharts. **Não usa API nem banco**: lê `../dados/base_sintetica.json` e `../dados/modelo_previsao.json` direto.
As ações (mudar status de alerta, liberar exame, responder questionário, editar módulo) ficam numa camada em memória + `localStorage`
(`src/store.tsx`), geram alertas pelas regras de `src/rules.ts` e entram no registro de alterações. "Reiniciar demo" limpa tudo.

```
cd web && npm install && npm run dev     # http://localhost:5173
```

Permissões: [src/permissoes.ts](src/permissoes.ts). Previsão: `src/previsao.ts` (mesmo modelo do JSON).
Nome/contato do Coordenador são **gerados fictícios no navegador** (os identificadores reais do schema `restrito` não vão para o front).

## Roteiro rápido da demo
1. **Paciente** (qualquer um): responde o questionário com dor 8 → "equipe avisada".
2. **Enfermagem** → Alertas: o alerta novo está na fila → "Assumir" → "Marcar resolvido".
3. **Laboratório** → abre o paciente → "Liberar exame" com vitamina D = 12 → alerta para a nutricionista.
4. **Nutricionista** → vê o alerta; só edita o módulo Nutricional (os outros são somente leitura).
5. **Coordenador** → Dashboard (grupos < 5 suprimidos) e Registro de alterações com tudo que foi feito.
