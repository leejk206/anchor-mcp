// Live: load a real on-chain program and run program_info through anchor-mcp's own code path.
// Usage: tsx scripts/inspect.ts <programId> [rpc]
import { Connection } from "@solana/web3.js";
import { loadProgram } from "../src/idl.js";
import { buildToolDefs, callTool } from "../src/tools.js";

async function main() {
  const programId = process.argv[2];
  const rpc = process.argv[3] ?? "https://api.mainnet-beta.solana.com";
  if (!programId) throw new Error("usage: tsx scripts/inspect.ts <programId> [rpc]");
  const conn = new Connection(rpc, "confirmed");

  const lp = await loadProgram({ connection: conn, programId });
  const tools = buildToolDefs(lp);
  const info: any = await callTool(lp, "program_info", {});

  console.log(`\n${lp.programId.toBase58()}`);
  console.log(`  on-chain IDL loaded → ${tools.length} MCP tools generated`);
  if (lp.degraded) console.log(`  ⚠ degraded (read/simulate off): ${lp.degraded.slice(0, 90)}…`);
  console.log(`  instructions (${info.instructions.length}): ${info.instructions.slice(0, 10).map((i: any) => i.name).join(", ")}${info.instructions.length > 10 ? " …" : ""}`);
  console.log(`  account types (${info.accountTypes.length}): ${info.accountTypes.slice(0, 10).join(", ")}${info.accountTypes.length > 10 ? " …" : ""}`);
  const sampleIx = info.instructions.find((i: any) => i.args.length) ?? info.instructions[0];
  if (sampleIx) {
    console.log(`  sample tool → simulate_${sampleIx.name}`);
    console.log(`     args: ${sampleIx.args.map((a: any) => `${a.name}:${a.type}`).join(", ") || "(none)"}`);
    console.log(`     accounts: ${sampleIx.accounts.slice(0, 6).map((a: any) => a.name).join(", ")}`);
  }
}
main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
