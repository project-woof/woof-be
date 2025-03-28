import { betterAuth } from "better-auth";
import { validateToken } from "@/utils/jwt";

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
	try {
		const decoded = await validateToken(session.session.token, env);
		if (!decoded) {
			return new Response("Unauthorized: Invalid token", { status: 401 });
		}
		return undefined;
	} catch (error) {
		console.error("JWT verification failed:", error);
		return new Response("Unauthorized: Invalid token", { status: 401 });
	}
};
