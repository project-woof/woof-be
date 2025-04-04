import { d1Service } from "@/services/d1Service";

export const notificationService = {
	// Get notifications by user_id
	getNotifications: async (userId: string, env: Env): Promise<any[]> => {
		const query = `SELECT * FROM notifications WHERE user_id = ?;`;
		return await d1Service.executeQuery(query, [userId], env);
	},
};
