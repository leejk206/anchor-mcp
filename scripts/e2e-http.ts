// End-to-end over Streamable-HTTP: connect a real MCP client to a running HTTP server.
// Usage: tsx scripts/e2e-http.ts [url]   (default http://localhost:8787/mcp)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const url = process.argv[2] ?? "http://localhost:8787/mcp";
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: "anchor-mcp-http-e2e", version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("HTTP LIST TOOLS →", tools.tools.map((t) => t.name).join(", "));

  const info = await client.callTool({ name: "program_info", arguments: {} });
  const text = (info.content as any[])[0].text as string;
  console.log("HTTP program_info →", text.slice(0, 140).replace(/\s+/g, " "), "…");

  await client.close();
  console.log("HTTP E2E OK");
}
main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
