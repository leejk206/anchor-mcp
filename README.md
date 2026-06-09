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
- **Graceful degradation**: if the full Anchor client can't be built for an IDL, tool generation + `program_info` still work (read/simulate are disabled for that program, with the reason surfaced) — so *any* program with an IDL yields at least its instruction/account map.
- Exposed over **stdio** (drop-in for Claude Desktop / Cursor) **and Streamable-HTTP** (`--http <port>`, a real URL).

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
v1. Verified: loads an Anchor IDL (on-chain `Program.fetchIdl` or local file) → generates per-instruction MCP tools → serves over **stdio and Streamable-HTTP**.
- Offline: `scripts/smoke.ts` (tool gen), `scripts/e2e.ts` (stdio MCP round-trip), `scripts/e2e-http.ts` (HTTP MCP round-trip).
- On-chain (mainnet): `scripts/probe.ts` found on-chain IDLs for Squads/MarginFi/Kamino/Jupiter/Meteora/Pump.fun; `scripts/inspect.ts` ran `program_info` on Pump.fun (42 tools) and Squads v4 (degraded → 31 instructions); `scripts/live-read.ts` decoded Pump.fun's on-chain `Global` account via `read_account`.
- **Live `simulate` (mainnet)**: the [playground](https://anchor-mcp-playground.vercel.app) builds an instruction and runs `simulateTransaction` on-chain — returns real program logs, compute units, and decoded Anchor errors, no signing. (e.g. Pump.fun `toggle_cashback_enabled` → 9,684 CU + `NotAuthorized` decoded.)

Pending: npm publish. Full spec → `docs/SPEC.md`.

## Quickstart
```bash
# from npm (after publish):
npx anchor-mcp --program <PROGRAM_ID> --rpc https://api.mainnet-beta.solana.com

# or from source:
npm install && npm run build

# stdio (for Claude Desktop / Cursor) — point at a program ID or a local IDL:
node dist/index.js --program <PROGRAM_ID> --rpc https://api.mainnet-beta.solana.com
node dist/index.js --idl ./examples/sample-idl.json --program <PROGRAM_ID>

# Streamable-HTTP server at http://localhost:8787/mcp
node dist/index.js --http 8787 --program <PROGRAM_ID> --rpc https://api.mainnet-beta.solana.com
```

### Use with Claude Desktop / Cursor (stdio)
```json
{
  "mcpServers": {
    "anchor-mcp": {
      "command": "node",
      "args": ["/abs/path/to/anchor-mcp/dist/index.js", "--program", "<PROGRAM_ID>", "--rpc", "https://api.mainnet-beta.solana.com"]
    }
  }
}
```

Read + simulate only — **no signing in v1**.

## License
MIT

