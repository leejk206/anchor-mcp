import { readFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, type Idl } from "@coral-xyz/anchor";
import { makeReadonlyProvider } from "./provider.js";

export interface LoadedProgram {
  idl: Idl;
  programId: PublicKey;
  /** Full Anchor client. null when the IDL can't be built into a client (read/simulate then disabled). */
  program: Program | null;
  provider: AnchorProvider;
  /** Reason the Anchor client couldn't be built, if any. Tool generation & program_info still work. */
  degraded: string | null;
}

function idlAddress(idl: Idl): string | undefined {
  return (idl as any).address ?? (idl as any).metadata?.address;
}

/**
 * Load an Anchor program by program ID (on-chain IDL) or from a local IDL file.
 * Builds a read-only Anchor Program for tool generation, account reads, and simulation.
 */
export async function loadProgram(opts: {
  connection: Connection;
  programId?: string;
  idlPath?: string;
}): Promise<LoadedProgram> {
  const provider = makeReadonlyProvider(opts.connection);
  let idl: Idl | null = null;
  let programId: PublicKey;

  if (opts.idlPath) {
    idl = JSON.parse(readFileSync(opts.idlPath, "utf8")) as Idl;
    const addr = opts.programId ?? idlAddress(idl);
    if (!addr) throw new Error("IDL has no address — pass --program <programId> explicitly.");
    programId = new PublicKey(addr);
  } else {
    if (!opts.programId) throw new Error("Provide --program <programId> or --idl <file>.");
    programId = new PublicKey(opts.programId);
    idl = await Program.fetchIdl(programId, provider);
    if (!idl) {
      throw new Error(
        `No on-chain IDL found for ${opts.programId}. This program may not publish its IDL on-chain — pass a local IDL file via --idl <file>.`
      );
    }
  }

  // Anchor 0.30 reads the program id from idl.address.
  (idl as any).address = programId.toBase58();

  // Tool generation + program_info work directly from the IDL JSON. The full Anchor
  // client (needed only for read_account / simulate) can fail to build on some IDLs
  // (e.g. unusual type defs) — degrade gracefully instead of failing the whole load.
  let program: Program | null = null;
  let degraded: string | null = null;
  try {
    program = new Program(idl as Idl, provider);
  } catch (e: any) {
    degraded = `Anchor client could not be built for this IDL (${String(e?.message ?? e)}). Tool generation & program_info work; read_account/simulate are disabled for this program.`;
  }

  return { idl, programId, program, provider, degraded };
}
