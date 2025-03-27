// src/features/profile/profileHandler.ts
import { profileService } from './profileService';

export const profileHandler = async (request: Request, env: Env): Promise<Response> => {
	const url = new URL(request.url);

	// Get profile
	if (url.pathname === '/profile' && request.method === 'GET') {
		const userId = request.headers.get('user-id');
		const profile = await profileService.getProfileById(userId!, env);
		return profile ? new Response(JSON.stringify(profile), { status: 200 }) : new Response('Profile not found', { status: 404 });
	}

	// Update profile
	if (url.pathname === '/profile' && request.method === 'PUT') {
		const { userId, name, email } = await request.json();
		const success = await profileService.updateProfile(userId, name, email, env);
		return success ? new Response('Profile updated', { status: 200 }) : new Response('Error updating profile', { status: 500 });
	}

	return new Response('Not Found', { status: 404 });
};
