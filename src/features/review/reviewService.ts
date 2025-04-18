import { d1Service } from "@/services/d1Service";
import { generateUUID } from "@/utils/uuid";
import type { Review } from "@/types/reviewTypes";

export const reviewService = {
	// Get review by review_id
	getReviewById: async (reviewId: string, env: Env): Promise<Review[]> => {
		const query = "SELECT * FROM review WHERE review_id = ?";
		return await d1Service.executeQuery<Review>(query, [reviewId], env);
	},

	// Get all reviews by reviewer_id with pagination
	getReviewsByReviewerId: async (
		reviewerId: string,
		limit: number,
		offset: number,
		env: Env
	): Promise<Review[]> => {
		const query = `
      SELECT 
        review.*,
        user.profile_image_url,
        user.username
      FROM review
      JOIN user ON review.reviewee_id = user.id
      WHERE review.reviewer_id = ? 
      ORDER BY review.created_at DESC 
      LIMIT ? OFFSET ?;
    `;
		return await d1Service.executeQuery<Review>(
			query,
			[reviewerId, limit, offset],
			env
		);
	},

	// Get all reviews by reviewee_id with pagination
	getReviewsByRevieweeId: async (
		revieweeId: string,
		limit: number,
		offset: number,
		env: Env
	): Promise<Review[]> => {
		const query = `SELECT 
						review.*,
						user.profile_image_url,
						user.username
					FROM review
					JOIN user ON review.reviewer_id = user.id
					WHERE review.reviewee_id = ? 
					ORDER BY review.created_at DESC 
					LIMIT ? OFFSET ?;`;
		return await d1Service.executeQuery<Review>(
			query,
			[revieweeId, limit, offset],
			env
		);
	},

	// Create a new 
	// TODO: check end date before u can create review
	createReview: async (body: any, env: Env): Promise<Review[]> => {
		const review_id = generateUUID("review");
		const { reviewer_id, reviewee_id, rating, comment } = body;
		const query = `
      INSERT INTO review (review_id, reviewer_id, reviewee_id, rating, comment, created_at, last_updated)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;
    `;
		try {
			const newReview = await d1Service.executeQuery<Review>(
				query,
				[review_id, reviewer_id, reviewee_id, rating, comment],
				env
			);
			const updateQuery = `
			UPDATE petsitter
			SET 
				total_reviews = total_reviews + 1,
				sum_of_rating = sum_of_rating + ?
			WHERE id = ?;
			`;

			await d1Service.executeQuery<Review>(
				updateQuery,
				[rating, reviewee_id],
				env
			);

			return newReview
		} catch (error) {
			console.error("Error inserting review:", error);
			throw error;
		}
	},

	// Update an existing review
	updateReview: async (
		review_id: string,
		data: Partial<Review>,
		env: Env
	): Promise<boolean> => {
		let updateFields: string[] = [];
		let bindValues: (string | number)[] = [];

		if (data.reviewer_id !== undefined) {
			updateFields.push("reviewer_id = ?");
			bindValues.push(data.reviewer_id);
		}
		if (data.reviewee_id !== undefined) {
			updateFields.push("reviewee_id = ?");
			bindValues.push(data.reviewee_id);
		}
		if (data.rating !== undefined) {
			if (data.rating < 1 || data.rating > 5) {
				throw new Error("Rating must be between 1 and 5");
			}
			updateFields.push("rating = ?");
			bindValues.push(data.rating);
		}
		if (data.comment !== undefined) {
			updateFields.push("comment = ?");
			bindValues.push(data.comment);
		}
		if (updateFields.length === 0) {
			return false;
		}
		// Append the review ID for the WHERE clause
		bindValues.push(review_id);
		const query = `UPDATE review SET ${updateFields.join(
			", "
		)}, last_updated = CURRENT_TIMESTAMP WHERE review_id = ?`;
		try {
			await d1Service.executeQuery<Review>(query, bindValues, env);
			return true;
		} catch (error) {
			console.error("Error updating profile:", error);
			return false;
		}
	},

	// Delete a review
	deleteReview: async (reviewId: string, env: Env): Promise<Review[]> => {
		const query = "DELETE FROM review WHERE review_id = ?";
		return await d1Service.executeQuery<Review>(query, [reviewId], env);
	},
};
