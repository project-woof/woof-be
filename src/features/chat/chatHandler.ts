import { chatService } from './chatService';

export const chatHandler = async (request: Request, env: Env): Promise<Response> => {
	const url = new URL(request.url);

	if (url.pathname === '/chat/create' && request.method === 'POST') {
		const { roomName } = await request.json();
		const chatRoom = await chatService.createChatRoom(roomName, env);
		return new Response(JSON.stringify(chatRoom), { status: 201 });
	}

	if (url.pathname === '/chat/messages' && request.method === 'POST') {
		const { roomId, userId, message } = await request.json();
		const success = await chatService.addMessageToChatRoom(roomId, userId, message, env);
		return success ? new Response('Message added', { status: 200 }) : new Response('Error adding message', { status: 500 });
	}

	return new Response('Not Found', { status: 404 });
};
