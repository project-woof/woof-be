/// <reference types="@cloudflare/workers-types" />

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

interface TokenData {
  access_token?: string;
  error?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

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

    if (url.pathname === "/auth/google/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing authorization code", { status: 400 });
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

const tokenData: TokenData = await tokenResponse.json();

      if (tokenData.error) {
        return new Response(`OAuth error: ${tokenData.error}`, { status: 400 });
      }

      const headers = new Headers();
      headers.append(
        "Set-Cookie",
        `auth_token=${tokenData.access_token}; Path=/; HttpOnly; Secure; Max-Age=86400`
      );
      headers.append("Location", "/");

      return new Response(null, { status: 302, headers });
    }

    return new Response("Auth Service: Route not found", { status: 404 });
  },
};
