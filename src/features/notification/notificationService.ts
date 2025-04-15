import { d1Service } from "@/services/d1Service";
import type { Notification } from "@/types/notificationTypes";
import { generateUUID } from "@/utils/uuid";

export const notificationService = {
	// Get notifications by user_id
	getNotifications: async (userId: string, env: Env): Promise<any[]> => {
		const query = `
					SELECT n.*, u.username
					FROM notification n
					INNER JOIN user u ON n.sender_id = u.id
					WHERE n.user_id = ?;
				`;
		return await d1Service.executeQuery(query, [userId], env);
	},

	// Create notification based on notification type and existence
	createNotification: async (body: any, env: Env): Promise<Notification[]> => {
		const notification_id = generateUUID("notification");
		const { user_id, sender_id, room_id, notification_type } = body;
		if (notification_type === "message") {
			const query = `
						UPDATE notification SET count = count + 1
						WHERE user_id = ? AND sender_id = ? AND room_id = ? and notification_type = 'message'
						RETURNING *;
					`;
			const updated = await d1Service.executeQuery<Notification>(
				query,
				[user_id, sender_id, room_id],
				env
			);
			if (updated && updated.length > 0) {
				return updated;
			}
		}

		const insertQuery = `
						INSERT INTO notification 
							(notification_id, user_id, sender_id, room_id, notification_type)
						VALUES 
							(?, ?, ?, ?, ?)
						RETURNING *;
						`;
		return await d1Service.executeQuery<Notification>(
			insertQuery,
			[notification_id, user_id, sender_id, room_id, notification_type],
			env
		);
	},

	// Delete notifications by roomId
	deleteNotificationsByRoomId: async (
		roomId: string,
		env: Env
	): Promise<any> => {
		const query = `DELETE FROM notification WHERE room_id = ?;`;
		return await d1Service.executeQuery(query, [roomId], env);
	},

	// Delete all notifications by userId
	deleteAllNotificationsByUserId: async (
		userId: string,
		env: Env
	): Promise<any> => {
		const query = `DELETE FROM notification WHERE user_id = ?;`;
		return await d1Service.executeQuery(query, [userId], env);
	},
};
