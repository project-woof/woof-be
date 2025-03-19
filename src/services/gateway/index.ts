/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Define any environment variables (e.g., URLs for microservices) here.
  // Example:
  // AUTH_SERVICE_URL: string;
  // BOOKING_SERVICE_URL: string;
}

export default {
  async fetch(
    request: Request
    // env: Env,
    // ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health Check Endpoint
    if (url.pathname === "/health") {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(healthData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Example routing logic can be added below
    // if (url.pathname.startsWith("/auth")) { ... }
    // if (url.pathname.startsWith("/booking")) { ... }

    return new Response("API Gateway: Route not found", { status: 404 });
  },
};
