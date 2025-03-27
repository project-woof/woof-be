import { authService } from "./authService";

export const authHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	if (url.pathname === "/auth/signup" && request.method === "POST") {
		const { username, passwordHash } = await request.json();
		const success = await authService.createUser(username, passwordHash, env);
		return success
			? new Response("User created successfully", { status: 201 })
			: new Response("Error creating user", { status: 500 });
	}

	if (url.pathname === "/auth/login" && request.method === "POST") {
		const { username, passwordHash } = await request.json();
		const user = await authService.getUserByUsername(username, env);
		if (user && user.password_hash === passwordHash) {
			return new Response("Login successful", { status: 200 });
		}
		return new Response("Invalid credentials", { status: 401 });
	}

	return new Response("Not Found", { status: 404 });
};
