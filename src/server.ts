import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { LoadedProgram } from "./idl.js";
import { buildToolDefs, callTool } from "./tools.js";

/** Start the MCP server over stdio, exposing tools generated from the loaded Anchor program. */
export async function startStdioServer(lp: LoadedProgram): Promise<void> {
  const server = new Server({ name: "anchor-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });
  const tools = buildToolDefs(lp);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      const result = await callTool(lp, req.params.name, req.params.arguments ?? {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e: any) {
      return { isError: true, content: [{ type: "text", text: `Error: ${e?.message ?? String(e)}` }] };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (stdout is the MCP channel).
  console.error(`anchor-mcp ready — ${tools.length} tools for ${lp.programId.toBase58()}`);
}
