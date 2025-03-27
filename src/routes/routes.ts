import { healthCheck } from "@/utils/health";
import { handleCORS, addCORSHeaders } from "@/utils/cors";
import { authHandler } from "@/features/auth/authHandler";
import { chatHandler } from "@/features/chat/chatHandler";
import { bookingHandler } from "@/features/booking/bookingHandler";
import { profileHandler } from "@/features/profile/profileHandler";
import { reviewHandler } from "@/features/review/reviewHandler";
import { notificationHandler } from "@/features/notification/notificationHandler";

export const handleRequest = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	const corsResponse = handleCORS(request);
	if (corsResponse.status === 204) {
		return corsResponse;
	}

	let response: Response;

	if (url.pathname === "/health") {
		response = await healthCheck(env);
	}

	if (url.pathname.startsWith("/auth")) {
		response = await authHandler(request, env);
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
	} else {
		response = new Response("Not Found", { status: 404 });
	}

	return addCORSHeaders(response, corsResponse);
};
