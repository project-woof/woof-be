/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Define any bindings your Profile service might need.
  // For example, a D1 database for profiles or an R2 bucket for profile images:
  // PROFILE_DB: D1Database;
  // PROFILE_BUCKET: R2Bucket;
}

export default {
  async fetch(
    request: Request
    // env: Env,
    // ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/profile/health") {
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
