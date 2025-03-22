/// <reference types="@cloudflare/workers-types" />

export interface Env {
  // Service envs are typed as Fetcher
  AUTH_SERVICE: Fetcher;
  BOOKING_SERVICE: Fetcher;
  PROFILE_SERVICE: Fetcher;
  CHAT_SERVICE: Fetcher;
  NOTIFICATION_SERVICE: Fetcher;
  REVIEW_SERVICE: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Handle preflight OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      // Return a minimal 200 with the necessary CORS headers
      return new Response(null, {
        status: 200,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);

    // Health check endpoint for the gateway
    if (url.pathname === "/health") {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
      // Wrap the JSON response with CORS
      return addCorsHeaders(
        new Response(JSON.stringify(healthData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Route-based forwarding using service envs
    if (url.pathname.startsWith("/auth")) {
      const newRequest = rewriteRequest(request, "/auth");
      const proxiedResponse = await env.AUTH_SERVICE.fetch(newRequest);
      return addCorsHeaders(proxiedResponse);
    } else if (url.pathname.startsWith("/booking")) {
      const newRequest = rewriteRequest(request, "/booking");
      const proxiedResponse = await env.BOOKING_SERVICE.fetch(newRequest);
      return addCorsHeaders(proxiedResponse);
    } else if (url.pathname.startsWith("/profile")) {
      const newRequest = rewriteRequest(request, "/profile");
      const proxiedResponse = await env.PROFILE_SERVICE.fetch(newRequest);
      return addCorsHeaders(proxiedResponse);
    } else if (url.pathname.startsWith("/chat")) {
      const newRequest = rewriteRequest(request, "/chat");
      const proxiedResponse = await env.CHAT_SERVICE.fetch(newRequest);
      return addCorsHeaders(proxiedResponse);
    } else if (url.pathname.startsWith("/notification")) {
      const newRequest = rewriteRequest(request, "/notification");
      const proxiedResponse = await env.NOTIFICATION_SERVICE.fetch(newRequest);
      return addCorsHeaders(proxiedResponse);
    } else if (url.pathname.startsWith("/review")) {
      const newRequest = rewriteRequest(request, "/review");
      const proxiedResponse = await env.REVIEW_SERVICE.fetch(newRequest);
      return addCorsHeaders(proxiedResponse);
    }

    // If no route matched, return 404 with CORS
    return addCorsHeaders(
      new Response("API Gateway: Route not found", { status: 404 })
    );
  },
};

/**
 * Helper function that rewrites the URL of the request by removing a given prefix.
 * This allows the target service to see the expected route.
 */
function rewriteRequest(request: Request, prefix: string): Request {
  const originalURL = new URL(request.url);
  // Remove the specified prefix; also remove any extra trailing slashes
  const newPath = originalURL.pathname.replace(prefix, "").replace(/\/+$/, "");
  const newURL = new URL(originalURL.toString());
  newURL.pathname = newPath || "/";
  // Create a new request with the rewritten URL but same method, headers, and body
  return new Request(newURL.toString(), request);
}

/**
 * Returns the default CORS headers for your Worker.
 * Adjust the domain/methods/headers as needed for your use case.
 */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Wraps an existing response with CORS headers.
 */
function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  const cors = corsHeaders();
  for (const [key, value] of Object.entries(cors)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
