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

    return new Response("Chat Service: Route not found", { status: 404 });
  },
};
