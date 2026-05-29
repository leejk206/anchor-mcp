#!/usr/bin/env node
import { makeConnection } from "./provider.js";
import { loadProgram } from "./idl.js";
import { startStdioServer } from "./server.js";

function argVal(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const programId = argVal("--program") ?? process.env.ANCHOR_MCP_PROGRAM_ID;
  const idlPath = argVal("--idl") ?? process.env.ANCHOR_MCP_IDL_PATH;
  const rpcUrl = argVal("--rpc") ?? process.env.ANCHOR_MCP_RPC_URL;

  const connection = makeConnection(rpcUrl);
  const lp = await loadProgram({ connection, programId, idlPath });
  await startStdioServer(lp);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
