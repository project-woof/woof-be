import { betterAuth } from "better-auth";
import { authService } from "./authService";

export const authHandler = async (
	auth: ReturnType<typeof betterAuth>,
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Reroute to frontpage if login
	if (url.pathname === "/api/auth/" && request.method === "GET") {
		const cookie = request.headers.get("Cookie");
		const bearer_token = cookie?.split("=")[1].split(".")[0];
		const clientURL = "https://woof-fe.pages.dev";
		const redirectURL = `${clientURL}/?login=success&token=${bearer_token}`;
		return Response.redirect(redirectURL, 302);
	}

	// Reroute to signup if new user
	if (url.pathname === "/api/auth/signup" && request.method === "GET") {
		const cookie = request.headers.get("Cookie");
		const bearer_token = cookie?.split("=")[1].split(".")[0];
		const clientURL = "https://woof-fe.pages.dev";
		const redirectURL = `${clientURL}/signup?login=success&token=${bearer_token}`;
		return Response.redirect(redirectURL, 302);
	}

	// Return user if called
	if (url.pathname === "/api/auth/get-user" && request.method === "GET") {
		const token = url.searchParams.get("token");
		if (!token) {
			return new Response("Token is required", { status: 400 });
		}
		const user = await authService.getUserByToken(token, env);
		return new Response(JSON.stringify(user[0]), { status: 200 });
	}

	// Serve other auth endpoints
	return await auth.handler(request);
};
