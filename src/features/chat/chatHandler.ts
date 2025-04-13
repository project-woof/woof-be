import { chatService } from "./chatService";
import { notifyLongPoll } from "@/utils/notify";

export const chatHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Get chat rooms by user_id
	if (
		url.pathname.startsWith("/chat/getChatRooms/") &&
		request.method === "GET"
	) {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const chatRooms = await chatService.getChatRooms(userId, env);
		return new Response(JSON.stringify(chatRooms), { status: 200 });
	}

	// Get messages by room_id
	if (
		url.pathname.startsWith("/chat/getMessages/") &&
		request.method === "GET"
	) {
		const roomId = url.pathname.split("/").pop();
		if (!roomId) {
			return new Response("Room ID is required", { status: 400 });
		}
		const messages = await chatService.getMessages(roomId, env);
		return new Response(JSON.stringify(messages), { status: 200 });
	}

	// Create a new chat room
	if (
		url.pathname.startsWith("/chat/createChatRoom") &&
		request.method === "POST"
	) {
		const body = await request.json();
		const existingChatRoom = await chatService.getChatRoomByParticipantIds(
			body,
			env
		);
		if (existingChatRoom.length > 0) {
			return new Response(JSON.stringify(existingChatRoom[0]), { status: 200 });
		}
		const newChatRoom = await chatService.createChatRoom(body, env);
		if (newChatRoom.length === 0) {
			return new Response("Chat Room Not Created Or Found", { status: 400 });
		}
		return new Response(JSON.stringify(newChatRoom[0]), { status: 201 });
	}

	// Create a new message in a chat room
	if (
		url.pathname.startsWith("/chat/createMessage") &&
		request.method === "POST"
	) {
		try {
			const body = await request.json();
			const message = await chatService.addMessageToChatRoom(body, env);
			if (message.length === 0) {
				return new Response("Message Not Created", { status: 400 });
			}
			const { recipient_id } = body as any;
			notifyLongPoll(env, recipient_id, "messages").catch((error) => {
				console.error("Long poll message error:", error);
			});
			return new Response(JSON.stringify(message[0]), { status: 201 });
		} catch (error) {
			console.error("Error creating message:", error);
			return new Response("Internal Server Error", { status: 500 });
		}
	}

	// Chat API Endpoint Not Found
	return new Response("Chat API Endpoint Not Found", { status: 404 });
};
