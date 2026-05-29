// Offline smoke test: load an IDL and print the generated MCP tools (no signing, no send).
// Usage: tsx scripts/smoke.ts <idl.json> [programId]
import { Connection } from "@solana/web3.js";
import { loadProgram } from "../src/idl.js";
import { buildToolDefs } from "../src/tools.js";

async function main() {
  const idlPath = process.argv[2];
  if (!idlPath) throw new Error("usage: tsx scripts/smoke.ts <idl.json> [programId]");
  const programId = process.argv[3];
  const connection = new Connection(process.env.ANCHOR_MCP_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
  const lp = await loadProgram({ connection, idlPath, programId });
  const tools = buildToolDefs(lp);
  console.log(`Loaded ${lp.programId.toBase58()} — generated ${tools.length} MCP tools:\n`);
  for (const t of tools) console.log(`  • ${t.name}\n      ${t.description}`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
