import { reviewService } from "./reviewService";
import type { ReviewData } from "@/types/reviewTypes";

export const reviewHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Get review by review_id
	if (
		url.pathname.startsWith("/review/getReview") &&
		request.method === "GET"
	) {
		// Assuming the review ID is the last segment in the pathname
		const reviewId = url.pathname.split("/").pop();
		if (!reviewId) {
			return new Response("Review ID is required", { status: 400 });
		}
		const review = await reviewService.getReviewById(reviewId, env);
		// Expect review to be returned as an array
		if (Array.isArray(review) && review.length === 0) {
			return new Response("Review Not Found", { status: 404 });
		}
		return new Response(JSON.stringify(review), { status: 200 });
	}

	// Get all reviews by reviewer_id with pagination
	if (
		url.pathname === "/review/getReviews/reviewer" &&
		request.method === "GET"
	) {
		const reviewerId = url.searchParams.get("reviewer-id");
		if (!reviewerId) {
			return new Response("Unauthorized", { status: 401 });
		}
		const limit = parseInt(url.searchParams.get("limit") || "10");
		const offset = parseInt(url.searchParams.get("offset") || "0");
		const reviews = await reviewService.getReviewsByReviewerId(
			reviewerId,
			limit,
			offset,
			env
		);
		if (Array.isArray(reviews) && reviews.length === 0) {
			return new Response("Reviewer Not Found", { status: 404 });
		}
		// Assuming the first item contains the total count via the alias "total"
		const total = reviews.length > 0 ? (reviews[0].total as number) : 0;
		return new Response(
			JSON.stringify({
				reviews: reviews.map(({ total, user_exists, ...review }) => review),
				pagination: {
					total,
					limit,
					offset,
					hasMore: offset + reviews.length < total,
				},
			}),
			{ status: 200 }
		);
	}

	// Get all reviews by reviewer_id with pagination
	if (
		url.pathname === "/review/getReviews/reviewee" &&
		request.method === "GET"
	) {
		const revieweeId = url.searchParams.get("reviewee-id");
		if (!revieweeId) {
			return new Response("Unauthorized", { status: 401 });
		}
		const limit = parseInt(url.searchParams.get("limit") || "10");
		const offset = parseInt(url.searchParams.get("offset") || "0");
		const reviews = await reviewService.getReviewsByRevieweeId(
			revieweeId,
			limit,
			offset,
			env
		);
		if (Array.isArray(reviews) && reviews.length === 0) {
			return new Response("Reviewer Not Found", { status: 404 });
		}
		// Assuming the first item contains the total count via the alias "total"
		const total = reviews.length > 0 ? (reviews[0].total as number) : 0;
		return new Response(
			JSON.stringify({
				reviews: reviews.map(({ total, user_exists, ...review }) => review),
				pagination: {
					total,
					limit,
					offset,
					hasMore: offset + reviews.length < total,
				},
			}),
			{ status: 200 }
		);
	}

	// Create a new review
	if (url.pathname === "/review/createReview" && request.method === "POST") {
		try {
			const body = await request.json();
			const review = await reviewService.createReview(body, env);
			// Expect non-select query result to contain meta info in the first element
			if (Array.isArray(review) && review.length === 0) {
				return new Response("Review Not Created", { status: 400 });
			}
			return new Response(JSON.stringify(review), { status: 201 });
		} catch (error: unknown) {
			console.error("Error creating review:", error);
			if (error instanceof Error) {
				if (error.message.includes("foreign key constraint failed")) {
					return new Response(
						JSON.stringify({ error: "Reviewer or Reviewee not found" }),
						{ status: 404 }
					);
				}
			}
			return new Response(
				JSON.stringify({ error: "An unexpected error occurred" }),
				{ status: 500 }
			);
		}
	}

	// Update an existing review
	if (url.pathname === "/review/updateReview" && request.method === "PUT") {
		const body = (await request.json()) as Partial<ReviewData>;
		const { review_id } = body;
		if (!review_id) {
			return new Response(JSON.stringify({ error: "Missing review ID" }), {
				status: 400,
			});
		}
		const success = await reviewService.updateReview(review_id, body, env);
		return success
			? new Response("Review updated", { status: 200 })
			: new Response("Error updating review", { status: 500 });
	}

	// Delete a review
	if (url.pathname === "/review/deleteReview" && request.method === "DELETE") {
		const reviewId = url.pathname.split("/").pop();
		if (!reviewId) {
			return new Response("Review ID is required", { status: 400 });
		}
		const result = await reviewService.deleteReview(reviewId, env);
		// Expect the result to be an array with a meta field
		if (Array.isArray(result) && result[0]?.changes === 0) {
			return new Response("Review Not Found", { status: 404 });
		}
		return new Response(JSON.stringify(result), { status: 200 });
	}

	// Review API Endpoint Not Found
	return new Response("Review API Endpoint Not Found", { status: 404 });
};
