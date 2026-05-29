import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

/** RPC connection. Defaults to devnet; override via --rpc or ANCHOR_MCP_RPC_URL. */
export function makeConnection(rpcUrl?: string): Connection {
  const url = rpcUrl || process.env.ANCHOR_MCP_RPC_URL || clusterApiUrl("devnet");
  return new Connection(url, "confirmed");
}

/**
 * Read-only Anchor provider. The wallet is a throwaway keypair used ONLY to satisfy
 * Anchor's types — anchor-mcp never signs or sends in v1 (read + simulate only).
 */
export function makeReadonlyProvider(connection: Connection): AnchorProvider {
  const wallet = new Wallet(Keypair.generate());
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}
