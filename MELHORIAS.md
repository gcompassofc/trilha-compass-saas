# Melhorias, erros e otimizações — backlog técnico

> Registro de pontos identificados durante o desenvolvimento, para revisitarmos depois.
> Nada aqui é urgente/quebrado em produção — o app funciona. É dívida técnica e oportunidades.
> Organizado por **categoria** e priorizado por **ganho × esforço** (alta prioridade = muito ganho, pouco esforço).
>
> Última atualização: 2026-05-29.

---

## 🔴 Alta prioridade (muito ganho, pouco esforço)

### 1. `WeeklyPlanner.tsx` é código morto (1459 linhas)
- **Onde:** [src/views/WeeklyPlanner.tsx](src/views/WeeklyPlanner.tsx)
- **Problema:** o arquivo não é importado em nenhum lugar (a aba ativa é o `SprintPlanner`). São 1459 linhas que confundem quem lê o código, pesam no build e na busca.
- **Ação:** confirmar que está realmente órfão (`grep` por `WeeklyPlanner` retorna só o próprio arquivo) e **deletar**.
- **Ganho:** −1459 linhas, menos confusão, build um pouco menor. **Esforço:** mínimo.

### 2. `node_modules` dessincroniza por causa do OneDrive
- **Problema:** o projeto vive em `OneDrive/Documentos/`, e o OneDrive ocasionalmente remove arquivos de `node_modules` (foi exatamente a causa dos erros de `tsc` de 29/05 — `@types/react` sumiu, apesar de estar no lockfile).
- **Ação (escolher uma):**
  - Documentar no `CLAUDE.md`: "se `tsc` acusar erros estranhos de `key`/`React`, rode `npm install`".
  - Melhor: mover o repositório para fora do OneDrive (ex: `C:\dev\trilha-compass-saas`) — elimina a causa.
  - Ou: excluir `node_modules` da sincronização do OneDrive (configuração do OneDrive).
- **Ganho:** evita perda de tempo recorrente com erros fantasma. **Esforço:** baixo.

### 3. `forEach(async ...)` engole erros e não aguarda — sync bidirecional
- **Onde:** [src/App.tsx:172](src/App.tsx#L172) e [src/App.tsx:193](src/App.tsx#L193) (dentro de `handleUpdateClient`).
- **Problema:** `array.forEach(async (x) => { await ... })` **não** espera os `await` internos. Resultado: a função `handleUpdateClient` retorna antes de a sincronização terminar, erros nas escritas são silenciosamente perdidos, e não há garantia de ordem. Em sync bidirecional Cliente↔Planejador isso pode causar estados inconsistentes (uma tarefa deletada num lado que não some no outro).
- **Ação:** trocar por `for (const x of array) { await ... }` ou `await Promise.all(array.map(async ...))`.
- **Ganho:** confiabilidade da sincronização (o ponto mais frágil do app). **Esforço:** baixo.

---

## 🟡 Média prioridade (ganho real, esforço moderado)

### 4. Queries do Firestore trazem coleções inteiras e filtram no client
- **Onde:** [src/services/db.ts](src/services/db.ts) — `subscribeToIncompleteTasks` (linha ~154), `subscribeToCompletedSince` (nova), e o `deleteTeamMember` que faz `getDocs(collection(...))` de clients e tasks inteiros ([db.ts:217](src/services/db.ts#L217), [db.ts:235](src/services/db.ts#L235)).
- **Problema:** conforme o histórico de tarefas cresce, baixar **todas** as tarefas (incompletas + concluídas dos últimos 3 meses) para filtrar no navegador fica caro (banda, memória, custo de leitura do Firestore). Hoje é OK; em 1–2 anos de uso, não.
- **Ação (quando o volume justificar):** criar índices compostos no Firestore e mover os filtros (`weekId >=`, `completed ==`) para a query (`where(...)` server-side com `limit`). O comentário no código já menciona "sem índice composto" como decisão consciente — então é uma evolução planejada, não um bug.
- **Ganho:** escalabilidade e custo. **Esforço:** médio (exige criar índices no console do Firebase + ajustar queries).

### 5. `SprintPlanner.tsx` com 2702 linhas — difícil de manter
- **Onde:** [src/views/SprintPlanner/SprintPlanner.tsx](src/views/SprintPlanner/SprintPlanner.tsx)
- **Problema:** é o maior arquivo do projeto e concentra UI, gamificação, drag-and-drop, modais, rituais e lógica de overdue. Qualquer mudança exige navegar um arquivo enorme; aumenta o risco de regressão.
- **Ação:** extrair subcomponentes para arquivos próprios (ex: `TaskCard`, `SubtaskRow`, `DaySection`, `OverdueSection`, modais) e mover lógica pura para `utils.ts`/`adapter.ts`. Fazer **incrementalmente**, um pedaço por vez, com o app rodando entre cada extração.
- **Ganho:** manutenibilidade. **Esforço:** médio/alto (fazer aos poucos).

### 6. Lógica de sincronização Cliente↔Planejador é complexa e frágil
- **Onde:** [src/App.tsx](src/App.tsx) — `handleUpdateClient` (linhas ~150-300) e `handleUpdateTask`.
- **Problema:** a sync de mão dupla tem muitos caminhos especiais (fallback por título para tarefas legadas sem `masterTaskId`, criação/remoção condicional de WeeklyTasks por mudança de data, etc.). É difícil de raciocinar e propenso a edge cases.
- **Ação:** considerar centralizar a sync numa camada/serviço dedicado com testes, ou simplificar o modelo (ex: sempre garantir `masterTaskId`, eliminando o fallback por título). Documentar as regras de sync num diagrama.
- **Ganho:** menos bugs de "sumiu/duplicou tarefa". **Esforço:** alto (mexer aqui é arriscado — exige testes antes).

---

## 🟢 Baixa prioridade (polimento / qualidade de código)

### 7. Bundle JS grande (1.37 MB / 381 KB gzip) sem code-splitting
- **Onde:** saída do `npm run build` (warning de chunk > 500 KB).
- **Problema:** tudo num único chunk — primeiro carregamento mais lento. Firebase, recharts, motion e todas as views vêm juntos.
- **Ação:** `React.lazy` + `Suspense` para carregar cada aba (view) sob demanda, e/ou `build.rollupOptions.output.manualChunks` para separar vendors (firebase, recharts).
- **Ganho:** tempo de carregamento inicial. **Esforço:** médio.

### 8. Usos de `any` (9 ocorrências) e `console.*` deixados (8 ocorrências)
- **Onde:** espalhados em `src/` (ex: `setActiveTab(item.id as any)` no Sidebar; logs de debug).
- **Ação:** tipar os `any` corretamente (agora que `@types/react` está instalado, o `tsc` ajuda) e remover/condicionar `console.log` de debug (manter só os `console.error` úteis em `handleError`).
- **Ganho:** robustez de tipos e console limpo em produção. **Esforço:** baixo.

### 9. `migração leve` de `completedAt` é só em memória
- **Onde:** [src/views/Reports/analytics.ts](src/views/Reports/analytics.ts) — `completionWeekId()`.
- **Contexto:** tarefas concluídas **antes** da feature de Relatórios não têm `completedAt`; estimamos pela `dueDate`/`weekId` em memória (decisão consciente, sem reescrita destrutiva).
- **Ação (se quiser histórico mais preciso):** botão/rotina única que persiste o `completedAt` estimado no Firestore para as tarefas antigas. Opcional — o comportamento atual é suficiente.
- **Ganho:** precisão do histórico antigo. **Esforço:** baixo/médio.

### 10. Sem testes automatizados
- **Problema:** não há testes. As partes mais arriscadas (sync bidirecional, agregações do dashboard, parsing de tempo/datas) não têm rede de segurança.
- **Ação:** começar pequeno — testes unitários para funções **puras** que já existem e são fáceis de testar: `analytics.ts` (Reports), `adapter.ts`, `utils.ts` (parseTimeText, fmtMinutes), `dateUtils.ts`. Usar Vitest (integra com Vite).
- **Ganho:** confiança para refatorar os itens 5 e 6. **Esforço:** médio (setup + escrever os primeiros testes).

---

## Notas
- Itens 1, 2 e 3 são os de melhor relação ganho/esforço — bons candidatos para o próximo passe.
- Itens 5 e 6 (refatorações grandes) só valem a pena **depois** de ter testes (item 10) cobrindo o comportamento atual.
- `design/dashboard.html` é referência de design (não entra no build) — manter.
