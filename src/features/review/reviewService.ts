// src/services/review/reviewService.ts
import { d1Service } from '@/services/d1Service';

export const reviewService = {
	// Add a review for a product/service
	addReview: async (userId: string, productId: string, reviewText: string, env: Env): Promise<boolean> => {
		const query = 'INSERT INTO reviews (user_id, product_id, review_text) VALUES (?, ?, ?)';
		try {
			await d1Service.executeQuery(query, [userId, productId, reviewText], env);
			return true;
		} catch (error) {
			console.error('Error adding review:', error);
			return false;
		}
	},

	// Get reviews for a product/service
	getReviewsForProduct: async (productId: string, env: Env): Promise<any[]> => {
		const query = 'SELECT * FROM reviews WHERE product_id = ?';
		return await d1Service.executeQuery(query, [productId], env);
	},
};
