import { d1Service } from "@/services/d1Service";
import { generateUUID } from "@/utils/uuid";
import {
	ChatRoom,
	ChatMessage,
	ChatRoomSummary,
	ChatMessageSummary,
} from "@/types/chatTypes";

export const chatService = {
	// Get chat rooms by user_id
	getChatRooms: async (
		user_id: string,
		env: Env
	): Promise<ChatRoomSummary[]> => {
		const query = `SELECT 
					c.room_id,
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
			[user_id, user_id, user_id, user_id],
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

	// Create a new chat room if room doesn't exist
	createChatRoom: async (body: any, env: Env): Promise<ChatRoom[]> => {
		const room_id = generateUUID("room");
		const { participant1_id, participant2_id } = body;
		const query = `WITH existing AS (
						SELECT *
						FROM chatroom
						WHERE participant1_id = LEAST(?, ?)
						AND participant2_id = GREATEST(?, ?)
						LIMIT 1
					),
					inserted AS (
						INSERT INTO chatroom (room_id, participant1_id, participant2_id)
						SELECT ?, LEAST(?, ?), GREATEST(?, ?)
						WHERE NOT EXISTS (SELECT 1 FROM existing)
						RETURNING *
					)
					SELECT * FROM existing
					UNION ALL
					SELECT * FROM inserted;
					`;
		return await d1Service.executeQuery<ChatRoom>(
			query,
			[
				participant1_id,
				participant2_id,
				participant1_id,
				participant2_id,
				room_id,
				participant1_id,
				participant2_id,
				participant1_id,
				participant2_id,
			],
			env
		);
	},

	// Create a new message in a chat room and update chatroom last_message
	addMessageToChatRoom: async (body: any, env: Env): Promise<ChatMessage[]> => {
		const message_id = generateUUID("message");
		const { room_id, sender_id, text } = body;
		const query = `WITH new_message AS (
						INSERT INTO chatmessage (message_id, room_id, sender_id, text)
						VALUES (?, ?, ?, ?)
						RETURNING *
					),
					update_chatroom AS (
						UPDATE chatroom
						SET last_message = ?,
							last_updated = CURRENT_TIMESTAMP
						WHERE room_id = ?
					)
					SELECT * FROM new_message;
					`;
		return await d1Service.executeQuery<ChatMessage>(
			query,
			[message_id, room_id, sender_id, text, text, room_id],
			env
		);
	},
};
