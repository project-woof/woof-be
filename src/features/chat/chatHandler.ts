import { chatService } from "./chatService";

export const chatHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Get chat rooms by user_id
	if (url.pathname === "/chat/getChatRooms/" && request.method === "GET") {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const chatRooms = await chatService.getChatRooms(userId, env);
		return new Response(JSON.stringify(chatRooms), { status: 200 });
	}

	// Get messages by room_id
	if (url.pathname === "/chat/getMessages/" && request.method === "GET") {
		const roomId = url.pathname.split("/").pop();
		if (!roomId) {
			return new Response("Room ID is required", { status: 400 });
		}
		const messages = await chatService.getMessages(roomId, env);
		return new Response(JSON.stringify(messages), { status: 200 });
	}

	// Create a new chat room
	if (url.pathname === "/chat/createChatRoom" && request.method === "POST") {
		const body = await request.json();
		const chatRoom = await chatService.createChatRoom(body, env);
		if (chatRoom.length === 0) {
			return new Response("Chat Room Not Created Or Found", { status: 400 });
		}
		return new Response(JSON.stringify(chatRoom[0]), { status: 201 });
	}

	// Create a new message in a chat room
	if (url.pathname === "/chat/createMessage" && request.method === "POST") {
		const body = await request.json();
		const message = await chatService.addMessageToChatRoom(body, env);
		if (message.length === 0) {
			return new Response("Message Not Created", { status: 400 });
		}
		return new Response(JSON.stringify(message[0]), { status: 201 });
	}

	// Chat API Endpoint Not Found
	return new Response("Chat API Endpoint Not Found", { status: 404 });
};
