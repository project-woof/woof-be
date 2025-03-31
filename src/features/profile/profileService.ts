import { d1Service } from "@/services/d1Service";
import { generateUUID } from "@/utils/uuid";
import type { User } from "@/types/profileTypes";

export const profileService = {
	// Get a profile by user ID
	getProfileById: async (userId: string, env: Env): Promise<any | null> => {
		const query = "SELECT * FROM user WHERE id = ?";
		return await d1Service.executeQuery<User>(query, [userId], env);
	},

	// TODO: Replace with createPetsitter (auth handles user creation)
	// Create a new profile
	createProfile: async (body: any, env: Env): Promise<any | null> => {
		const user_id = generateUUID("user");
		// Destructure expected fields from the incoming body.
		const {
			username,
			email,
			profile_image_url,
			latitude,
			longitude,
			description,
			is_petsitter,
		} = body;

		// Basic validation: username and email are required.
		if (!username || !email) {
			throw new Error("Username and email are required");
		}

		const query = `
			INSERT INTO user 
				(user_id, username, email, profile_image_url, latitude, longitude, description, is_petsitter)
			VALUES 
				(?, ?, ?, ?, ?, ?, ?, ?) RETURNING *;
			`;
		try {
			return await d1Service.executeQuery<User>(
				query,
				[
					user_id,
					username,
					email,
					profile_image_url || null,
					latitude || null,
					longitude || null,
					description || null,
					is_petsitter || 0,
				],
				env
			);
		} catch (error) {
			console.error("Error inserting profile:", error);
			throw error;
		}
	},

	// Update an existing profile (partial update)
	updateProfile: async (
		userId: string,
		data: Partial<User>,
		env: Env
	): Promise<boolean> => {
		const fields: string[] = [];
		const values: any[] = [];
		if (data.username !== undefined) {
			fields.push("username = ?");
			values.push(data.username);
		}
		if (data.email !== undefined) {
			fields.push("email = ?");
			values.push(data.email);
		}
		if (data.profile_image_url !== undefined) {
			fields.push("profile_image_url = ?");
			values.push(data.profile_image_url);
		}
		if (data.latitude !== undefined) {
			fields.push("latitude = ?");
			values.push(data.latitude);
		}
		if (data.longitude !== undefined) {
			fields.push("longitude = ?");
			values.push(data.longitude);
		}
		if (data.description !== undefined) {
			fields.push("description = ?");
			values.push(data.description);
		}
		if (data.is_petsitter !== undefined) {
			fields.push("is_petsitter = ?");
			values.push(data.is_petsitter);
		}
		if (fields.length === 0) return false;
		values.push(userId);
		const query = `UPDATE user SET ${fields.join(
			", "
		)}, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?`;
		try {
			await d1Service.executeQuery(query, values, env);
			return true;
		} catch (error) {
			console.error("Error updating profile:", error);
			return false;
		}
	},

	// Delete a profile by user ID
	deleteProfile: async (userId: string, env: Env): Promise<any> => {
		const query = "DELETE FROM user WHERE user_id = ?";
		return await d1Service.executeQuery<User>(query, [userId], env);
	},
};
