import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor";

/** RPC connection. Defaults to devnet; override via --rpc or ANCHOR_MCP_RPC_URL. */
export function makeConnection(rpcUrl?: string): Connection {
  const url = rpcUrl || process.env.ANCHOR_MCP_RPC_URL || clusterApiUrl("devnet");
  return new Connection(url, "confirmed");
}

/**
 * Read-only Anchor provider. Uses a throwaway keypair as a no-op wallet purely to satisfy
 * AnchorProvider — anchor-mcp never signs or sends in v1 (read + simulate only). We avoid
 * Anchor's NodeWallet (not in the ESM build) so this stays bundler-portable (Next.js/Vercel).
 */
export function makeReadonlyProvider(connection: Connection): AnchorProvider {
  const keypair = Keypair.generate();
  const wallet = {
    publicKey: keypair.publicKey,
    payer: keypair,
    signTransaction: async (tx: unknown) => tx,
    signAllTransactions: async (txs: unknown[]) => txs,
  } as unknown as Wallet;
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}
