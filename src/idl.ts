import { readFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, type Idl } from "@coral-xyz/anchor";
import { makeReadonlyProvider } from "./provider.js";

export interface LoadedProgram {
  idl: Idl;
  programId: PublicKey;
  program: Program;
  provider: AnchorProvider;
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
  const program = new Program(idl as Idl, provider);
  return { idl, programId, program, provider };
}
