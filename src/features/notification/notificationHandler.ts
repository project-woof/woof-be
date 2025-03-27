import { notificationService } from './notificationService';
import { CreateBookingRequestBody } from '@/types/notificationTypes';

export const notificationHandler = async (request: Request, env: Env): Promise<Response> => {
	const url = new URL(request.url);

	if (url.pathname === '/notification/create' && request.method === 'POST') {
		const { userId, message }: CreateBookingRequestBody = await request.json();
		const notification = await notificationService.createNotification(userId, message, env);
		return new Response(JSON.stringify(notification), { status: 201 });
	}

	if (url.pathname === '/notification/user' && request.method === 'GET') {
		const userId = request.headers.get('user-id');
		const notifications = await notificationService.getNotificationsForUser(userId!, env);
		return new Response(JSON.stringify(notifications), { status: 200 });
	}

	return new Response('Not Found', { status: 404 });
};
