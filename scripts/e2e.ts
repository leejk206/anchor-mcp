// End-to-end: connect a real MCP client to the built server over stdio, list tools, call program_info.
// Offline (uses local sample IDL). Usage: tsx scripts/e2e.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js", "--idl", "examples/sample-idl.json"],
  });
  const client = new Client({ name: "anchor-mcp-e2e", version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("LIST TOOLS →", tools.tools.map((t) => t.name).join(", "));

  const info = await client.callTool({ name: "program_info", arguments: {} });
  const text = (info.content as any[])[0].text as string;
  console.log("\nCALL program_info →\n" + text);

  await client.close();
  console.log("\nE2E OK");
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
