/// <reference types="@cloudflare/workers-types" />

export interface Env {
  AUTH_SERVICE_URL: string;
  BOOKING_SERVICE_URL: string;
  PROFILE_SERVICE_URL: string;
  CHAT_SERVICE_URL: string;
  NOTIFICATION_SERVICE_URL: string;
  REVIEW_SERVICE_URL: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
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

    if (url.pathname.startsWith("/auth")) {
      // Forward request to Auth Service
      return fetchProxy(request, env.AUTH_SERVICE_URL, "/auth");
    } else if (url.pathname.startsWith("/booking")) {
      // Forward request to Booking Service
      return fetchProxy(request, env.BOOKING_SERVICE_URL, "/booking");
    } else if (url.pathname.startsWith("/profile")) {
      // Forward request to Profile Service
      return fetchProxy(request, env.PROFILE_SERVICE_URL, "/profile");
    } else if (url.pathname.startsWith("/chat")) {
      // Forward request to Chat Service
      return fetchProxy(request, env.CHAT_SERVICE_URL, "/chat");
    } else if (url.pathname.startsWith("/notification")) {
      // Forward request to Notification Service
      return fetchProxy(request, env.NOTIFICATION_SERVICE_URL, "/notification");
    } else if (url.pathname.startsWith("/review")) {
      // Forward request to Review Service
      return fetchProxy(request, env.REVIEW_SERVICE_URL, "/review");
    }

    return new Response("API Gateway: Route not found", { status: 404 });
  },
};

/**
 * Helper function to proxy a request to a target service.
 * @param request The original request
 * @param targetBaseURL The base URL for the target service
 * @param prefix The path prefix (e.g., "/auth") to remove from the original URL
 */
async function fetchProxy(
  request: Request,
  targetBaseURL: string,
  prefix: string
): Promise<Response> {
  const originalURL = new URL(request.url);
  // Remove the prefix from the path
  const newPath = originalURL.pathname.replace(prefix, "");
  const targetURL = new URL(targetBaseURL + newPath);

  // Copy method, headers, and body
  return fetch(targetURL.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}
