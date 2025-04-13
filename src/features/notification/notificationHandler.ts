import { notifyLongPoll } from "@/utils/notify";
import { notificationService } from "./notificationService";

export const notificationHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Get notifications by user_id
	if (
		url.pathname.startsWith("/notification/getNofications/") &&
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
		return new Response(JSON.stringify(notifications), { status: 200 });
	}

	// Create new notification
	if (
		url.pathname.startsWith("/notification/createNotification") &&
		request.method === "POST"
	) {
		const body = await request.json();
		if (!body) {
			return new Response("Body is required", { status: 400 });
		}
		const notification = await notificationService.createNotification(
			body,
			env
		);
		if (!notification || notification.length === 0) {
			return new Response("Notification Not Created", { status: 400 });
		}
		const { user_id } = body as any;
		notifyLongPoll(env, user_id, "notifications").catch((error) => {
			console.error("Long poll notification error:", error);
		});
		return new Response(JSON.stringify(notification[0]), { status: 201 });
	}

	// Clear notifications by roomId
	if (
		url.pathname.startsWith("/notification/clearNotifications/") &&
		request.method === "DELETE"
	) {
		const roomId = url.pathname.split("/").pop();
		if (!roomId) {
			return new Response("Room ID is required", { status: 400 });
		}
		const response = await notificationService.deleteNotificationsByRoomId(
			roomId,
			env
		);
		if (!response || response.changes === 0) {
			return new Response("Notifications Not Deleted", { status: 400 });
		}
		return new Response("Notifications Deleted Successfully", { status: 200 });
	}

	// Clear all notifications
	if (
		url.pathname.startsWith("/notification/clearAllNotifications/") &&
		request.method === "DELETE"
	) {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const response = await notificationService.deleteAllNotificationsByUserId(
			userId,
			env
		);
		if (!response || response.changes === 0) {
			return new Response("Notifications Not Deleted", { status: 400 });
		}
		return new Response("Notifications Deleted Successfully", { status: 200 });
	}

	// Notification API Endpoint Not Found
	return new Response("Notification API Endpoint Not Found", { status: 404 });
};
