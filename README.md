# anchor-mcp

**Generate MCP tools from any Solana Anchor program's IDL.** Point it at a program ID (on-chain IDL) or a local IDL file → it generates one MCP tool per instruction at runtime, so AI agents (Claude, Cursor) can **read and simulate** that program's instructions with zero per-program code.

> The EVM "abi-to-mcp" ergonomic, brought to Anchor — where no runtime IDL→MCP-tools server exists yet.

## Why
To let an AI agent interact with a Solana program today, you hand-write integration code per program. Existing Solana MCP servers (SendAI `solana-mcp`, Solana Foundation `dev-mcp`) expose a **fixed, curated** action set for pre-integrated protocols — they don't work on an arbitrary program nobody integrated. Anchor's IDL→TS-client codegen is **build-time, for human devs** — not a runtime, agent-shaped interface. anchor-mcp fills that gap.

## What it does
- Load IDL: `Program.fetchIdl(programId)` (on-chain) **or** local IDL file (fallback).
- Generate an MCP tool per instruction (typed args + accounts).
- **Auto-derive PDAs** when the IDL declares seeds (Anchor 0.30+); else accept explicit address input.
- **Simulate-by-default**: build + `simulateTransaction` + account reads. **No signing in v1** (safety — write = drain risk).
- Exposed over **stdio + Streamable-HTTP** (a real public URL) → drop-in for Claude Desktop / Cursor.

## How it differs (verified competitor scan)
| Existing | What it does | anchor-mcp difference |
|---|---|---|
| SendAI `solana-mcp` (159★) | fixed curated actions (transfer/trade/mint) | **dynamic, program-agnostic** — any Anchor program from its IDL |
| Solana Foundation `dev-mcp` | generic RPC/docs demo; IDL-tools = unbuilt TODO | builds exactly that TODO |
| IDL-parsing MCPs / Solvitor | parse/decode/fetch (read) | **generates callable tools** (build+simulate), not just parse |
| Codama / anchor TS client | build-time codegen for humans | **runtime, no-build, agent-shaped** + PDA auto-resolve + simulate-first |

## Honest scope / limits
- Anchor **0.30+ IDL** (seed metadata) for auto-PDA; legacy → explicit addresses. Non-Anchor / no-IDL programs out of scope.
- Differentiation is real but not huge in raw code — moat = runtime/no-build + agent schemas + PDA auto-resolve + simulate-first safety.
- Risk: Codama could ship an official MCP renderer → mitigate by building **as a Codama renderer** to ride their ecosystem.

## Status
v1 (early). Core works: loads an Anchor IDL (on-chain via `Program.fetchIdl` or a local file), generates per-instruction MCP tools, and runs as an MCP stdio server — verified offline via `scripts/smoke.ts` (tool generation) and `scripts/e2e.ts` (real MCP client↔server round-trip). Pending: live devnet-program demo, Streamable-HTTP transport, npm publish. Full spec → `docs/SPEC.md`.

## Quickstart
```bash
npm install && npm run build
# point at a program (on-chain IDL) or a local IDL file:
node dist/index.js --program <PROGRAM_ID> --rpc https://api.devnet.solana.com
node dist/index.js --idl ./examples/sample-idl.json --program <PROGRAM_ID>
```
Add to Claude Desktop / Cursor as an MCP server running the above command. Read + simulate only (no signing in v1).

## License
MIT
