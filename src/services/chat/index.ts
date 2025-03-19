/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Define any bindings your Chat service might need.
}

export default {
  async fetch(
    request: Request
    // env: Env,
    // ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(healthData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Chat Service: Route not found", { status: 404 });
  },
};
