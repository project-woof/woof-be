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
		userLat: number,
		userLon: number,
		userId: string,
		env: Env
	): Promise<PetsitterProfile[]> => {
		const query = `SELECT 
						user.*,
						petsitter.total_reviews,
						petsitter.sum_of_rating,
						petsitter.price,
						petsitter.description AS petsitter_description,
						petsitter.service_tags,
						sqrt(
							(user.latitude - ?)*(user.latitude - ?) +
							(user.longitude - ?)*(user.longitude - ?)
						) AS distance
					FROM user
					INNER JOIN petsitter ON user.id = petsitter.id
					WHERE user.id = ?;`;
		return await d1Service.executeQuery<PetsitterProfile>(
			query,
			[userLat, userLat, userLon, userLon, userId],
			env
		);
	},

	// Updated getPetsitterList function in profileService.ts
	getPetsitterList: async (
		userLat: number,
		userLon: number,
		limit: number,
		offset: number,
		filters: {
			distance?: number;
			priceMin?: number;
			priceMax?: number;
			services?: string[];
			sortBy?: "distance" | "reviews" | "rating";
		},
		env: Env
	): Promise<PetsitterProfile[]> => {
		// Construct the base query with dynamic filtering conditions
		let query = `
        WITH petsitters_with_distance AS (
            SELECT
                u.*,
                p.total_reviews,
                p.sum_of_rating,
                p.price,
                p.description AS petsitter_description,
                p.service_tags,
                (
                    SELECT pi.image_url
                    FROM petsitter_image pi
                    WHERE pi.petsitter_id = p.id
                    ORDER BY pi.created_at ASC
                    LIMIT 1
                ) AS first_image,
                sqrt(
                    (u.latitude - ?)*(u.latitude - ?) +
                    (u.longitude - ?)*(u.longitude - ?)
                ) AS distance,
                CASE 
                    WHEN p.total_reviews > 0 THEN p.sum_of_rating / p.total_reviews 
                    ELSE 0 
                END AS avg_rating
            FROM user u
            INNER JOIN petsitter p ON u.id = p.id
            WHERE u.is_petsitter = 1
    `;

		// Prepare parameters array
		const queryParams: any[] = [userLat, userLat, userLon, userLon];

		// Add distance filter
		if (filters.distance) {
			query += ` AND sqrt(
            (u.latitude - ?)*(u.latitude - ?) +
            (u.longitude - ?)*(u.longitude - ?)
        ) <= ?`;
			queryParams.push(userLat, userLat, userLon, userLon, filters.distance);
		}

		// Add price range filter
		if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
			query += ` AND p.price BETWEEN COALESCE(?, 0) AND COALESCE(?, 999999)`;
			queryParams.push(filters.priceMin ?? 0, filters.priceMax ?? 999999);
		}

		// Add services filter
		if (filters.services && filters.services.length > 0) {
			const serviceConditions = filters.services
				.map(() => `p.service_tags LIKE ?`)
				.join(" OR ");
			query += ` AND (${serviceConditions})`;

			// Add service tags to params (using % for LIKE to match partial tags)
			filters.services.forEach((service) => {
				queryParams.push(`%${service}%`);
			});
		}

		query += `) SELECT
        *,
        (
            0.5 * (1.0 / (distance + 1)) +
            0.3 * avg_rating +
            0.2 * total_reviews
        ) AS composite_score
        FROM petsitters_with_distance
    `;

		// Add sorting
		switch (filters.sortBy) {
			case "distance":
				query += ` ORDER BY distance ASC`;
				break;
			case "reviews":
				query += ` ORDER BY total_reviews DESC`;
				break;
			case "rating":
				query += ` ORDER BY avg_rating DESC`;
				break;
			default:
				query += ` ORDER BY composite_score DESC`;
		}

		// Add pagination
		query += ` LIMIT ? OFFSET ?`;
		queryParams.push(limit, offset);

		return await d1Service.executeQuery<PetsitterProfile>(
			query,
			queryParams,
			env
		);
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
				(id, username, email, profile_image_url, latitude, longitude, description, is_petsitter)
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
		data: Partial<PetsitterProfile>,
		env: Env
	): Promise<boolean> => {
		try {
			// First, update the user table
			const userFields: string[] = [];
			const userValues: any[] = [];

			if (data.username !== undefined) {
				userFields.push("username = ?");
				userValues.push(data.username);
			}
			if (data.email !== undefined) {
				userFields.push("email = ?");
				userValues.push(data.email);
			}
			if (data.profile_image_url !== undefined) {
				userFields.push("profile_image_url = ?");
				userValues.push(data.profile_image_url);
			}
			if (data.latitude !== undefined) {
				userFields.push("latitude = ?");
				userValues.push(data.latitude);
			}
			if (data.longitude !== undefined) {
				userFields.push("longitude = ?");
				userValues.push(data.longitude);
			}
			if (data.description !== undefined) {
				userFields.push("description = ?");
				userValues.push(data.description);
			}
			if (data.is_petsitter !== undefined) {
				userFields.push("is_petsitter = ?");
				userValues.push(data.is_petsitter);
			}

			// Update user table if there are user fields to update
			if (userFields.length > 0) {
				userValues.push(userId);
				const userQuery = `UPDATE user SET ${userFields.join(
					", "
				)}, last_updated = CURRENT_TIMESTAMP WHERE id = ?`;
				await d1Service.executeQuery(userQuery, userValues, env);
			}

			// If not a petsitter or no petsitter-specific fields to update, we're done
			if (
				data.is_petsitter === 0 ||
				(data.price === undefined &&
					data.petsitter_description === undefined &&
					data.service_tags === undefined)
			) {
				return true;
			}

			// Check if petsitter record exists
			const checkQuery = "SELECT id FROM petsitter WHERE id = ?";
			const existingPetsitter = await d1Service.executeQuery(
				checkQuery,
				[userId],
				env
			);
			const petsitterExists = existingPetsitter.length > 0;

			// Process petsitter-specific fields
			if (petsitterExists) {
				// Update existing petsitter record
				const petsitterFields: string[] = [];
				const petsitterValues: any[] = [];

				if (data.price !== undefined) {
					petsitterFields.push("price = ?");
					petsitterValues.push(data.price);
				}

				if (data.petsitter_description !== undefined) {
					petsitterFields.push("description = ?");
					petsitterValues.push(data.petsitter_description);
				}

				if (data.service_tags !== undefined) {
					petsitterFields.push("service_tags = ?");
					petsitterValues.push(JSON.stringify(data.service_tags));
				}

				if (petsitterFields.length > 0) {
					petsitterValues.push(userId);
					const updateQuery = `UPDATE petsitter SET ${petsitterFields.join(
						", "
					)}, last_updated = CURRENT_TIMESTAMP WHERE id = ?`;
					await d1Service.executeQuery(updateQuery, petsitterValues, env);
				}
			} else {
				// Create new petsitter record
				const insertQuery = `
				INSERT INTO petsitter (id, total_reviews, sum_of_rating, price, description, service_tags)
				VALUES (?, ?, ?, ?, ?, ?)`;

				const params = [
					userId,
					0,
					0,
					data.price || 25, // Default price if not provided
					data.petsitter_description || "",
					JSON.stringify(data.service_tags || []),
				];

				await d1Service.executeQuery(insertQuery, params, env);
			}

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
