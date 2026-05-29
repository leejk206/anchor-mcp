# anchor-mcp — agent build context

TS MCP server that turns any Anchor program's IDL into agent-callable MCP tools (read + simulate). See `README.md` (overview), `docs/SPEC.md` (v1 spec).

## Stack
- Node 20+, TypeScript (ESM, `"type":"module"`, NodeNext-style imports use `.js` suffix).
- `@modelcontextprotocol/sdk` (MCP server, stdio), `@coral-xyz/anchor` 0.30, `@solana/web3.js`, `zod`.

## Structure
- `src/provider.ts` — RPC connection + read-only Anchor provider (throwaway wallet; never signs).
- `src/idl.ts` — `loadProgram()`: on-chain `Program.fetchIdl` or local IDL file → read-only `Program`.
- `src/coerce.ts` — JSON→IDL arg coercion, type labels, camelCase, JSON-safe serialization.
- `src/tools.ts` — `buildToolDefs()` (program_info, read_account, simulate_<ix>) + `callTool()`.
- `src/server.ts` — wires tools to an MCP stdio server.
- `src/index.ts` — entry; flags `--program <id>` / `--idl <file>` / `--rpc <url>` (or env `ANCHOR_MCP_*`).
- `scripts/smoke.ts` — offline: load IDL, print generated tools.

## Design rules (v1)
- **Read + simulate only. No signing/sending.** (Write = drain risk → v2 opt-in.)
- PDA / known-account resolution delegated to Anchor 0.30 `.accountsPartial()` builder (don't reimplement).
- Anchor 0.30 IDL: instruction/field names snake_case; method/account namespaces camelCase (`camel()`).
- stdout is the MCP channel → all logging to stderr.

## Run
- `npm i` → `npm run build` → `node dist/index.js --program <id>` (or `--idl examples/sample-idl.json --program <id>`).
- Smoke: `npm run smoke -- examples/sample-idl.json`.

## Roadmap (v2)
sign/write opt-in, legacy (<0.30) IDL support, Streamable-HTTP transport, richer PDA UX, possibly a Codama renderer.
