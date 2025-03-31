import { d1Service } from "@/services/d1Service";
import { generateUUID } from "@/utils/uuid";
import type { User, PetsitterProfile } from "@/types/profileTypes";

export const profileService = {
	// Get a profile by user ID
	getProfileById: async (userId: string, env: Env): Promise<User[]> => {
		const query = "SELECT * FROM user WHERE id = ?";
		return await d1Service.executeQuery<User>(query, [userId], env);
	},

	// Get a petsitter profile by user ID
	getPetsitterProfileById: async (
		userId: string,
		env: Env
	): Promise<PetsitterProfile[]> => {
		const query = `SELECT 
						user.*,
						petsitter.total_reviews,
						petsitter.sum_of_rating,
						petsitter.price,
						petsitter.description AS petsitter_description,
						petsitter.service_tags
					FROM user
					INNER JOIN petsitter ON user.id = petsitter.id
					WHERE user.id = ?;`;
		return await d1Service.executeQuery<PetsitterProfile>(query, [userId], env);
	},

	// Get a list of petsitter profiles including profile_image with pagination
	getPetsittersList: async (
		userLat: number,
		userLon: number,
		limit: number,
		offset: number,
		env: Env
	): Promise<PetsitterProfile[]> => {
		const query = `
		WITH petsitters_with_distance AS (
			SELECT
				u.*,
				p.total_reviews,
				p.sum_of_rating,
				p.price,
				p.description AS petsitter_description,
				p.service_tags,
				pi.image_url AS first_image,
				sqrt(
					(u.latitude - :user_lat) * (u.latitude - :user_lat) +
					(u.longitude - :user_lon) * (u.longitude - :user_lon)
				) AS distance,
				CASE 
					WHEN p.total_reviews > 0 THEN p.sum_of_rating / p.total_reviews 
					ELSE 0 
				END AS avg_rating
			FROM user u
			INNER JOIN petsitter p ON u.id = p.id
			LEFT JOIN (
				SELECT 
					pi1.petsitter_id, 
					pi1.image_url
				FROM petsitter_image pi1
				WHERE pi1.created_at = (
					SELECT MIN(pi2.created_at)
					FROM petsitter_image pi2
					WHERE pi2.petsitter_id = pi1.petsitter_id
				)
			) pi ON p.id = pi.petsitter_id
			WHERE u.is_petsitter = 1
		)
		SELECT
			*,
			(
				0.5 * (1.0 / (distance + 1)) +
				0.3 * avg_rating +
				0.2 * total_reviews
			) AS composite_score
		FROM petsitters_with_distance
		ORDER BY composite_score DESC
		LIMIT :limit OFFSET :offset;
		`;
		const params = {
			user_lat: userLat,
			user_lon: userLon,
			limit,
			offset,
		};
		return await d1Service.executeQuery<PetsitterProfile>(query, [params], env);
	},

	// TODO: Replace with createPetsitter (auth handles user creation)
	// Create a new profile
	createProfile: async (body: any, env: Env): Promise<User[]> => {
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
	deleteProfile: async (userId: string, env: Env): Promise<User[]> => {
		const query = "DELETE FROM user WHERE user_id = ?";
		return await d1Service.executeQuery<User>(query, [userId], env);
	},
};
