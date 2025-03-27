// src/features/review/reviewHandler.ts
import { reviewService } from './reviewService';

export const reviewHandler = async (request: Request, env: Env): Promise<Response> => {
	const url = new URL(request.url);

	// Add review
	if (url.pathname === '/review' && request.method === 'POST') {
		const { userId, productId, reviewText } = await request.json();
		const success = await reviewService.addReview(userId, productId, reviewText, env);
		return success ? new Response('Review added', { status: 201 }) : new Response('Error adding review', { status: 500 });
	}

	// Get reviews for product
	if (url.pathname === '/reviews' && request.method === 'GET') {
		const productId = request.headers.get('product-id');
		const reviews = await reviewService.getReviewsForProduct(productId!, env);
		return new Response(JSON.stringify(reviews), { status: 200 });
	}

	return new Response('Not Found', { status: 404 });
};
