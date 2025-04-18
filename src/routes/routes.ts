import { healthCheck } from "@/utils/health";
import { handleCORS, addCORSHeaders } from "@/utils/cors";
import { pollHandler } from "@/features/poll/pollHandler";
import { authHandler } from "@/features/auth/authHandler";
import { chatHandler } from "@/features/chat/chatHandler";
import { bookingHandler } from "@/features/booking/bookingHandler";
import { profileHandler } from "@/features/profile/profileHandler";
import { reviewHandler } from "@/features/review/reviewHandler";
import { notificationHandler } from "@/features/notification/notificationHandler";
import { authMiddleware } from "@/middleware/authMiddleware";
import { protectedRoutes } from "./protected";
import { betterAuth } from "better-auth";
import { imageHandler } from "@/features/image/imageHandler";

export const handleRequest = async (
	request: Request,
	env: Env,
	auth: ReturnType<typeof betterAuth>
): Promise<Response> => {
	const url = new URL(request.url);

	const corsResponse = handleCORS(request);
	if (corsResponse.status === 204) {
		return corsResponse;
	}

	const isProtectedRoute = protectedRoutes.some(
		(route) =>
			url.pathname.startsWith(route.path) && request.method === route.method
	);

	let response: Response;

	if (isProtectedRoute) {
		const authResponse = await authMiddleware(request, auth, env);
		if (authResponse) {
			return addCORSHeaders(authResponse, corsResponse);
		}
	}

	if (url.pathname.startsWith("/health")) {
		response = await healthCheck(env);
	} else if (
		url.pathname.startsWith("/poll") ||
		url.pathname.startsWith("/new")
	) {
		response = await pollHandler(request, env);
	} else if (url.pathname.startsWith("/api/auth")) {
		response = await authHandler(auth, request, env);
	} else if (url.pathname.startsWith("/chat")) {
		response = await chatHandler(request, env);
	} else if (url.pathname.startsWith("/booking")) {
		response = await bookingHandler(request, env);
	} else if (url.pathname.startsWith("/profile")) {
		response = await profileHandler(request, env);
	} else if (url.pathname.startsWith("/review")) {
		response = await reviewHandler(request, env);
	} else if (url.pathname.startsWith("/notification")) {
		response = await notificationHandler(request, env);
	} else if (url.pathname.startsWith("/image")) {
		response = await imageHandler(request, env);
	} else {
		response = new Response("Not Found", { status: 404 });
	}

	return addCORSHeaders(response, corsResponse);
};
