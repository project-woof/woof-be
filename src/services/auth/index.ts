/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Define any bindings your Auth service might need.
}

export default {
  async fetch(
    request: Request
    // env: Env,
    // ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/auth/health") {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(healthData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Placeholder: Add your profile-related logic here.
    return new Response("Profile Service: Route not found", { status: 404 });
  },
};
