import { d1Service } from "@/services/d1Service";
import type { Notification } from "@/types/notificationTypes";
import { generateUUID } from "@/utils/uuid";

export const notificationService = {
	// Get notifications by user_id
	getNotifications: async (userId: string, env: Env): Promise<any[]> => {
		const query = `SELECT * FROM notifications WHERE user_id = ?;`;
		return await d1Service.executeQuery(query, [userId], env);
	},

	createNotification: async (body: any, env: Env): Promise<Notification[]> => {
		const { user_id, sender_id, room_id, notification_type } = body;
		if (notification_type === "message") {
			const query = `
						UPDATE notification SET count = count + 1
						WHERE user_id = ? AND sender_id = ? AND room_id = ? and notification_type = 'message'
					`;
			return await d1Service.executeQuery<Notification>(
				query,
				[user_id, sender_id, room_id],
				env
			);
		} else {
			const notification_id = generateUUID("notification");
			const query = `
						INSERT INTO notifications (notification_id, user_id, sender_id, room_id, notification_type)
						VALUES (?, ?, ?, ?, ?) RETURNING *;
					`;
			return await d1Service.executeQuery<Notification>(
				query,
				[notification_id, user_id, sender_id, room_id, notification_type],
				env
			);
		}
	},

	// Delete notifications by room_id
	deleteNotificationsByRoomId: async (
		roomId: string,
		env: Env
	): Promise<any> => {
		const query = `DELETE FROM notifications WHERE room_id = ?;`;
		return await d1Service.executeQuery(query, [roomId], env);
	},
};
