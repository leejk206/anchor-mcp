import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { Connection } from "@solana/web3.js";
import { loadProgram, type LoadedProgram } from "../src/idl.js";
import { buildToolDefs } from "../src/tools.js";

// Offline: loadProgram with a local idlPath never hits the network, and the
// Connection constructor does not open a socket. So the whole suite is hermetic.
const idlPath = fileURLToPath(new URL("../examples/sample-idl.json", import.meta.url));

describe("buildToolDefs (counter sample IDL)", () => {
  let lp: LoadedProgram;
  let names: string[];

  beforeAll(async () => {
    const connection = new Connection("http://localhost:8899", "confirmed");
    lp = await loadProgram({ connection, idlPath });
    names = buildToolDefs(lp).map((t) => t.name);
  });

  it("builds a real Anchor client offline (not degraded)", () => {
    expect(lp.degraded).toBeNull();
    expect(lp.program).not.toBeNull();
  });

  it("includes program_info and read_account", () => {
    expect(names).toContain("program_info");
    expect(names).toContain("read_account");
  });

  it("emits one simulate_<ix> tool per instruction", () => {
    expect(names).toContain("simulate_initialize");
    expect(names).toContain("simulate_increment");
    expect(names.filter((n) => n.startsWith("simulate_")).sort()).toEqual([
      "simulate_increment",
      "simulate_initialize",
    ]);
  });

  it("produces exactly the expected tool set", () => {
    expect(names.sort()).toEqual(
      ["program_info", "read_account", "simulate_increment", "simulate_initialize"].sort()
    );
  });

  it("read_account enumerates the program's account types", () => {
    const readAcct = buildToolDefs(lp).find((t) => t.name === "read_account")!;
    expect(readAcct.inputSchema.properties.accountType.enum).toEqual(["Counter"]);
    expect(readAcct.inputSchema.required).toEqual(["accountType", "address"]);
  });

  it("simulate_increment exposes its u64 arg and account in the schema", () => {
    const sim = buildToolDefs(lp).find((t) => t.name === "simulate_increment")!;
    expect(sim.inputSchema.properties.args.properties.amount.description).toBe("type: u64");
    expect(Object.keys(sim.inputSchema.properties.accounts.properties)).toContain("counter");
    expect(sim.description).toContain("SIMULATE");
  });

  it("simulate_initialize has no args but lists its accounts", () => {
    const sim = buildToolDefs(lp).find((t) => t.name === "simulate_initialize")!;
    expect(sim.inputSchema.properties.args.properties).toEqual({});
    expect(Object.keys(sim.inputSchema.properties.accounts.properties).sort()).toEqual(
      ["counter", "payer", "system_program"].sort()
    );
  });
});

describe("buildToolDefs (degraded mode)", () => {
  it("returns only program_info when the Anchor client is unavailable", () => {
    const fake = {
      idl: { instructions: [], accounts: [] },
      programId: { toBase58: () => "FakeProgram1111111111111111111111111111111" },
      program: null,
      provider: {} as any,
      degraded: "client could not be built",
    } as unknown as LoadedProgram;
    const tools = buildToolDefs(fake);
    expect(tools.map((t) => t.name)).toEqual(["program_info"]);
    expect(tools[0].description).toContain("degraded");
  });
});
