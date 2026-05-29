import { randomUUID } from "node:crypto";
import http from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema, isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { LoadedProgram } from "./idl.js";
import { buildToolDefs, callTool } from "./tools.js";

/** Build an MCP server with this program's tools registered. */
function makeServer(lp: LoadedProgram): Server {
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
  return server;
}

/** Start over stdio (Claude Desktop / Cursor). */
export async function startStdioServer(lp: LoadedProgram): Promise<void> {
  const server = makeServer(lp);
  await server.connect(new StdioServerTransport());
  console.error(`anchor-mcp (stdio) ready — ${buildToolDefs(lp).length} tools for ${lp.programId.toBase58()}`);
}

/** Start a Streamable-HTTP MCP server at http://<host>:<port>/mcp (stateful, session-managed). */
export async function startHttpServer(lp: LoadedProgram, port: number): Promise<void> {
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  const httpServer = http.createServer((req, res) => {
    const path = (req.url ?? "").split("?")[0];
    if (path !== "/mcp") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: "Use /mcp" }, id: null }));
      return;
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const parsed = body ? JSON.parse(body) : undefined;
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        let transport = sessionId ? transports[sessionId] : undefined;

        if (!transport && isInitializeRequest(parsed)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports[sid] = transport!;
            },
          });
          transport.onclose = () => {
            if (transport!.sessionId) delete transports[transport!.sessionId];
          };
          await makeServer(lp).connect(transport);
        }

        if (!transport) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "No valid session (send initialize first)" }, id: null }));
          return;
        }

        await transport.handleRequest(req, res, parsed);
      } catch (e: any) {
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: String(e?.message ?? e) }, id: null }));
        }
      }
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  console.error(`anchor-mcp (http) ready at http://localhost:${port}/mcp — ${buildToolDefs(lp).length} tools for ${lp.programId.toBase58()}`);
}
