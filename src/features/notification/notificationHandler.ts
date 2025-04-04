import { notificationService } from "./notificationService";

export const notificationHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Get notifications by user_id
	if (
		url.pathname === "/notification/getNofications/" &&
		request.method === "GET"
	) {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const notifications = await notificationService.getNotifications(
			userId,
			env
		);
		return new Response(JSON.stringify(notifications), { status: 201 });
	}

	// Notification API Endpoint Not Found
	return new Response("Notification API Endpoint Not Found", { status: 404 });
};
