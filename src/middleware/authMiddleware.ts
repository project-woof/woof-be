import { betterAuth } from "better-auth";

export const authMiddleware = async (
	request: Request,
	auth: ReturnType<typeof betterAuth>,
	env: Env
): Promise<Response | undefined> => {
	const session = await auth.api.getSession({
		headers: request.headers,
	});
	if (!session) {
		return new Response("Unauthorized: No session", { status: 401 });
	}
};
