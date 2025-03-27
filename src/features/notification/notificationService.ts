import { d1Service } from "@/services/d1Service";

export const notificationService = {
	createNotification: async (
		userId: string,
		message: string,
		env: Env
	): Promise<any> => {
		const query = `INSERT INTO notifications (user_id, message) VALUES (?, ?);`;
		return await d1Service.executeQuery(query, [userId, message], env);
	},

	getNotificationsForUser: async (userId: string, env: Env): Promise<any[]> => {
		const query = `SELECT id, user_id, message FROM notifications WHERE user_id = ?;`;
		return await d1Service.executeQuery(query, [userId], env);
	},
};
