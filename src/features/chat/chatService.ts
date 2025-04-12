import { d1Service } from "@/services/d1Service";
import { generateUUID } from "@/utils/uuid";
import {
	ChatRoom,
	ChatMessage,
	ChatRoomSummary,
	ChatMessageSummary,
} from "@/types/chatTypes";

export const chatService = {
	// Get chat room by participant IDs
	getChatRoomByParticipantIds: async (
		body: any,
		env: Env
	): Promise<ChatRoom[]> => {
		const { participant1_id, participant2_id } = body;
		const query = `
					SELECT *
					FROM chatroom
					WHERE 
						CASE
							WHEN ? < ? THEN 
							CASE 
								WHEN participant1_id = ? AND participant2_id = ? THEN 1 
								ELSE 0 
							END
							ELSE 
							CASE 
								WHEN participant1_id = ? AND participant2_id = ? THEN 1 
								ELSE 0 
							END
						END = 1
				`;
		return await d1Service.executeQuery<ChatRoom>(
			query,
			[
				participant1_id,
				participant2_id,
				participant1_id,
				participant2_id,
				participant2_id,
				participant1_id,
			],
			env
		);
	},

	// Get chat rooms by user_id
	getChatRooms: async (
		user_id: string,
		env: Env
	): Promise<ChatRoomSummary[]> => {
		const query = `SELECT 
					c.room_id,
					CASE
						WHEN c.participant1_id = ? THEN u2.id 
						ELSE u1.id
					END as user_id,
					CASE 
						WHEN c.participant1_id = ? THEN u2.username 
						ELSE u1.username 
					END AS username,
					CASE 
						WHEN c.participant1_id = ? THEN u2.profile_image_url 
						ELSE u1.profile_image_url 
					END AS profile_image_url,
					c.last_message,
					c.last_updated
					FROM chatroom c
					JOIN user u1 ON c.participant1_id = u1.id
					JOIN user u2 ON c.participant2_id = u2.id
					WHERE c.participant1_id = ? OR c.participant2_id = ?
					ORDER BY c.last_updated DESC;
					`;
		return await d1Service.executeQuery<ChatRoomSummary>(
			query,
			[user_id, user_id, user_id, user_id, user_id],
			env
		);
	},

	// Get messages by room_id
	getMessages: async (
		room_id: string,
		env: Env
	): Promise<ChatMessageSummary[]> => {
		const query = `SELECT message_id, sender_id, text, created_at
						FROM chatmessage WHERE room_id = ?
						ORDER BY created_at ASC;`;
		return await d1Service.executeQuery<ChatMessageSummary>(
			query,
			[room_id],
			env
		);
	},

	// Create a new chat room
	createChatRoom: async (body: any, env: Env): Promise<ChatRoom[]> => {
		const room_id = generateUUID("room");
		const { participant1_id, participant2_id } = body;
		const insertQuery = `
						INSERT INTO chatroom (room_id, participant1_id, participant2_id)
						VALUES (
							?,
							CASE WHEN ? < ? THEN ? ELSE ? END,
							CASE WHEN ? < ? THEN ? ELSE ? END
						)
						RETURNING *
					`;
		return await d1Service.executeQuery<ChatRoom>(
			insertQuery,
			[
				room_id,
				participant1_id,
				participant2_id,
				participant1_id,
				participant2_id,
				participant1_id,
				participant2_id,
				participant2_id,
				participant1_id,
			],
			env
		);
	},

	// Create a new message in a chat room and update chatroom last_message
	addMessageToChatRoom: async (body: any, env: Env): Promise<ChatMessage[]> => {
		const message_id = generateUUID("message");
		const { room_id, sender_id, text } = body;

		// Due to Cloudflare Workers and D1 limitations, we cannot combine INSERT and UPDATE in a single query. ;-;
		const query = `
			INSERT INTO chatmessage (message_id, room_id, sender_id, text)
			VALUES (?, ?, ?, ?) RETURNING *;
		`;
		try {
			const message = await d1Service.executeQuery<ChatMessage>(
				query,
				[message_id, room_id, sender_id, text],
				env
			);

			if (message.length > 0) {
				const updateQuery = `
					UPDATE chatroom
					SET last_message = ?,
						last_updated = CURRENT_TIMESTAMP
					WHERE room_id = ?
				`;
				d1Service.executeQuery(updateQuery, [text, room_id], env);
			}

			return message;
		} catch (error) {
			console.error("Failed to add message:", error);
			throw new Error(`Failed to add message: ${(error as Error).message}`);
		}
	},
};
