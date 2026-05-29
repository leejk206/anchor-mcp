import { PublicKey, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import type { LoadedProgram } from "./idl.js";
import { coerceArg, typeLabel, camel, jsonSafe } from "./coerce.js";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: any;
}

/** Generate MCP tool definitions from the program's IDL: program_info, read_account, and simulate_<ix> per instruction. */
export function buildToolDefs(lp: LoadedProgram): ToolDef[] {
  const idl = lp.idl as any;
  const tools: ToolDef[] = [];

  tools.push({
    name: "program_info",
    description:
      `Describe Anchor program ${lp.programId.toBase58()} from its IDL: instructions, account types, errors.` +
      (lp.degraded ? " (read_account/simulate unavailable for this program — see program_info.degraded)" : ""),
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  });

  // Degraded mode: the Anchor client couldn't be built — only IDL-derived info is available.
  if (!lp.program) return tools;

  const accountTypes: string[] = (idl.accounts ?? []).map((a: any) => a.name);
  if (accountTypes.length) {
    tools.push({
      name: "read_account",
      description: `Fetch & decode an on-chain account owned by this program. accountType ∈ {${accountTypes.join(", ")}}.`,
      inputSchema: {
        type: "object",
        properties: {
          accountType: { type: "string", enum: accountTypes },
          address: { type: "string", description: "Base58 account address" },
        },
        required: ["accountType", "address"],
        additionalProperties: false,
      },
    });
  }

  for (const ix of idl.instructions ?? []) {
    const argProps: Record<string, any> = {};
    for (const a of ix.args ?? []) argProps[a.name] = { description: `type: ${typeLabel(a.type)}` };

    const acctProps: Record<string, any> = {};
    for (const acc of ix.accounts ?? []) {
      const flags = [acc.signer && "signer", (acc.writable || acc.isMut) && "writable", acc.pda && "pda(auto)"]
        .filter(Boolean)
        .join(",");
      acctProps[acc.name] = {
        type: "string",
        description: `pubkey${flags ? ` [${flags}]` : ""}${acc.pda ? " — may be auto-derived if omitted" : ""}`,
      };
    }

    tools.push({
      name: `simulate_${ix.name}`,
      description: `Build & SIMULATE the "${ix.name}" instruction (no signing). Returns logs, error, compute units.`,
      inputSchema: {
        type: "object",
        properties: {
          args: { type: "object", description: "Instruction args by name", properties: argProps },
          accounts: {
            type: "object",
            description: "Account pubkeys (base58) by name; PDAs/known accounts may be auto-resolved",
            properties: acctProps,
          },
          feePayer: { type: "string", description: "Optional fee payer pubkey for simulation" },
        },
        additionalProperties: false,
      },
    });
  }

  return tools;
}

/** Execute an MCP tool call against the loaded program. */
export async function callTool(lp: LoadedProgram, name: string, input: any): Promise<any> {
  const idl = lp.idl as any;

  if (name === "program_info") {
    return {
      programId: lp.programId.toBase58(),
      version: idl.metadata?.version ?? idl.version,
      degraded: lp.degraded ?? false,
      instructions: (idl.instructions ?? []).map((ix: any) => ({
        name: ix.name,
        args: (ix.args ?? []).map((a: any) => ({ name: a.name, type: typeLabel(a.type) })),
        accounts: (ix.accounts ?? []).map((a: any) => ({
          name: a.name,
          signer: !!a.signer,
          writable: !!(a.writable || a.isMut),
          pda: !!a.pda,
        })),
      })),
      accountTypes: (idl.accounts ?? []).map((a: any) => a.name),
      errors: (idl.errors ?? []).map((e: any) => ({ code: e.code, name: e.name, msg: e.msg })),
    };
  }

  if (!lp.program) throw new Error(lp.degraded ?? "Anchor client unavailable for this IDL.");

  if (name === "read_account") {
    const ns =
      (lp.program.account as any)[camel(input.accountType)] ?? (lp.program.account as any)[input.accountType];
    if (!ns) throw new Error(`Unknown account type: ${input.accountType}`);
    const data = await ns.fetch(new PublicKey(input.address));
    return jsonSafe(data);
  }

  if (name.startsWith("simulate_")) {
    const ixName = name.slice("simulate_".length);
    const ixIdl = (idl.instructions ?? []).find((i: any) => i.name === ixName);
    if (!ixIdl) throw new Error(`Unknown instruction: ${ixName}`);

    const orderedArgs = (ixIdl.args ?? []).map((a: any) => coerceArg(input.args?.[a.name], a.type));
    const accountsMap: Record<string, PublicKey> = {};
    for (const [k, v] of Object.entries(input.accounts ?? {})) if (v) accountsMap[k] = new PublicKey(v as string);

    const methods = lp.program.methods as any;
    const methodName = methods[ixName] ? ixName : camel(ixName);
    if (!methods[methodName]) throw new Error(`Method not found for instruction: ${ixName}`);

    let builder = methods[methodName](...orderedArgs);
    builder = builder.accountsPartial ? builder.accountsPartial(accountsMap) : builder.accounts(accountsMap);
    const ix = await builder.instruction();

    const conn = lp.provider.connection;
    const feePayer = new PublicKey(input.feePayer ?? lp.provider.publicKey);
    const { blockhash } = await conn.getLatestBlockhash();
    const msg = new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });

    return {
      err: sim.value.err,
      unitsConsumed: sim.value.unitsConsumed,
      logs: sim.value.logs,
      returnData: sim.value.returnData ?? null,
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}
