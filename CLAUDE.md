# Gutter — notas para agentes

Monorepo pnpm (`apps/*`, `packages/*`) + módulo Go em `server/` (via `go.work` na raiz).
O planejamento completo por fases está no README e no doc de planejamento do projeto.

## Comandos

- `pnpm check` — lint (Biome) + typecheck (TS 7, `tsc`) + Vitest. Rode antes de dar algo por pronto.
- `pnpm e2e` — Playwright em `apps/web/e2e` (builda e sobe preview em :4173).
- Go: `cd server && go vet ./... && go test ./...`.

## Regras de arquitetura

- `@gutter/reader` é puro: nada de fetch, Dexie, router ou File System API ali. Só `Source`/`PageSource`.
- Toda leitura de dados nas telas passa por `useSource()` + hooks em `apps/web/src/lib/queries.ts`.
- Pacotes internos são consumidos como TS fonte (`exports: ./src/index.ts`), sem build próprio.
- Classes Tailwind em `packages/*` só são vistas por causa do `@source` em `apps/web/src/styles.css`;
  um pacote novo com UI precisa entrar lá.
- ObjectURL criado = ObjectURL revogado. Use `PageCache` ou `useObjectUrl`.
- Decodificação (zip/rar/pdf) só dentro de `packages/workers`.

## Convenções

- Identificadores em inglês; comentários, UI e docs em pt-BR.
- Imports relativos com extensão `.ts`/`.tsx`.
- TS strict com `noUncheckedIndexedAccess` e `verbatimModuleSyntax` (`import type`).
- No Windows, prefira a ferramenta Write a heredocs do Bash para código (heredocs comem `\\`).
