// Probe well-known programs for an ON-CHAIN Anchor IDL (fetchIdl).
// Usage: tsx scripts/probe.ts [rpcUrl]
import { Connection, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { makeReadonlyProvider } from "../src/provider.js";

const CANDIDATES: Record<string, string> = {
  "Squads v4": "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
  "MarginFi v2": "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  "Drift v2": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcrYBfb",
  "Kamino Lend": "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
  "Jupiter v6": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "Phoenix": "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
  "Meteora DLMM": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  "Pump.fun": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
};

async function main() {
  const rpc = process.argv[2] ?? process.env.ANCHOR_MCP_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const conn = new Connection(rpc, "confirmed");
  const provider = makeReadonlyProvider(conn);
  console.log("RPC:", rpc, "\n");
  for (const [name, id] of Object.entries(CANDIDATES)) {
    try {
      const idl = await Program.fetchIdl(new PublicKey(id), provider);
      if (idl) {
        const ix = (idl as any).instructions?.length ?? 0;
        const spec = (idl as any).metadata?.spec ?? (idl as any).version ?? "?";
        console.log(`  ✓ ${name.padEnd(14)} ${id}  — on-chain IDL: ${ix} ix, spec=${spec}`);
      } else {
        console.log(`  ✗ ${name.padEnd(14)} ${id}  — no on-chain IDL`);
      }
    } catch (e: any) {
      console.log(`  ! ${name.padEnd(14)} ${id}  — ${String(e?.message ?? e).slice(0, 70)}`);
    }
  }
}
main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
