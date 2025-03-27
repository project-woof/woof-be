// src/services/profile/profileService.ts
import { d1Service } from '@/services/d1Service';

export const profileService = {
	// Get a user's profile by ID
	getProfileById: async (userId: string, env: Env): Promise<any | null> => {
		const query = 'SELECT * FROM profiles WHERE user_id = ?';
		const result = await d1Service.executeQuery<any>(query, [userId], env);
		return result.length > 0 ? result[0] : null;
	},

	// Update a user's profile
	updateProfile: async (userId: string, name: string, email: string, env: Env): Promise<boolean> => {
		const query = 'UPDATE profiles SET name = ?, email = ? WHERE user_id = ?';
		try {
			await d1Service.executeQuery(query, [name, email, userId], env);
			return true;
		} catch (error) {
			console.error('Error updating profile:', error);
			return false;
		}
	},
};
