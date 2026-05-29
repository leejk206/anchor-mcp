// Live read_account demo: decode a real on-chain account via anchor-mcp's tool path.
// Default target: Pump.fun "Global" account (PDA from seed "global").
// Usage: tsx scripts/live-read.ts [rpc]
import { Connection, PublicKey } from "@solana/web3.js";
import { loadProgram } from "../src/idl.js";
import { callTool } from "../src/tools.js";

const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

async function main() {
  const conn = new Connection(process.argv[2] ?? "https://api.mainnet-beta.solana.com", "confirmed");
  const lp = await loadProgram({ connection: conn, programId: PUMP });
  const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from("global")], new PublicKey(PUMP));
  console.log(`read_account(Global, ${globalPda.toBase58()}) →`);
  const decoded = await callTool(lp, "read_account", { accountType: "Global", address: globalPda.toBase58() });
  console.log(JSON.stringify(decoded, null, 2));
}
main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
