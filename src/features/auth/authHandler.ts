import { betterAuth } from "better-auth";

export const authHandler = async (
	auth: ReturnType<typeof betterAuth>,
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Reroute to frontpage if login
	if (url.pathname === "/api/auth/" && request.method === "GET") {
		const clientURL = "https://woof-fe.pages.dev";
		const redirectURL = `${clientURL}/?login=success`;
		return Response.redirect(redirectURL, 302);
	}

	// Reroute to signup if new user
	if (url.pathname === "/api/auth/signup" && request.method === "GET") {
		const clientURL = "https://woof-fe.pages.dev";
		const redirectURL = `${clientURL}/signup?login=success`;
		return Response.redirect(redirectURL, 302);
	}

	// Return session if called
	if (url.pathname === "/api/auth/get-session" && request.method === "GET") {
		return new Response(
			JSON.stringify(
				auth.api.getSession({
					headers: request.headers,
				})
			)
		);
	}

	// Serve other auth endpoints
	return await auth.handler(request);
};
