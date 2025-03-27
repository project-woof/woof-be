import { d1Service } from '@/services/d1Service';

export const chatService = {
	createChatRoom: async (roomName: string, env: Env): Promise<any> => {
		const query = `INSERT INTO chat_rooms (name) VALUES (?);`;
		return await d1Service.executeQuery(query, [roomName], env);
	},

	getAllChatRooms: async (env: Env): Promise<any[]> => {
		const query = `SELECT id, name FROM chat_rooms;`;
		return await d1Service.executeQuery(query, [], env);
	},

	addMessageToChatRoom: async (roomId: string, userId: string, message: string, env: Env): Promise<boolean> => {
		const query = `INSERT INTO messages (room_id, user_id, message) VALUES (?, ?, ?);`;
		try {
			await d1Service.executeQuery(query, [roomId, userId, message], env);
			return true;
		} catch (error) {
			console.error('Error adding message:', error);
			return false;
		}
	},
};
