/// <reference types="@cloudflare/workers-types" />

export interface Env {
  PETSITTER_DB: D1Database;
}

// Update interface to match new data structure
interface ReviewData {
  reviewer_id?: string;
  reviewee_id?: string;
  rating?: number;
  comment?: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Add CORS headers to all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    try {
      // Health check endpoint
      if (path === "/health") {
        const healthData = {
          status: "ok",
          timestamp: new Date().toISOString(),
        };
        return new Response(JSON.stringify(healthData), {
          status: 200,
          headers: corsHeaders,
        });
      }
      
      // Get all reviews (with pagination)
      else if (path === "/all") {
        const urlObj = new URL(request.url);
        const limit = parseInt(urlObj.searchParams.get("limit") || "10"); // Default 10
        const offset = parseInt(urlObj.searchParams.get("offset") || "0"); // Default 0
        
        return getAllReviews(env, corsHeaders, limit, offset);
      }
      
      // Get a single review by ID
      else if (path === "/get" && request.method === "GET") {
        const urlObj = new URL(request.url);
        const id = urlObj.searchParams.get("id");
        
        if (!id) {
          return new Response(JSON.stringify({ error: "Missing review ID" }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        return getReviewById(env, id, corsHeaders);
      }
      
      // Get reviews by reviewer ID (previously user ID)
      else if (path === "/reviewer" && request.method === "GET") {
        const urlObj = new URL(request.url);
        const reviewerId = urlObj.searchParams.get("reviewerId");
        const limit = parseInt(urlObj.searchParams.get("limit") || "10"); // Default 10
        const offset = parseInt(urlObj.searchParams.get("offset") || "0"); // Default 0
        
        if (!reviewerId) {
          return new Response(JSON.stringify({ error: "Missing reviewer ID" }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        return getReviewsByReviewerId(env, reviewerId, corsHeaders, limit, offset);
      }
      
      // Get reviews by reviewee ID (new endpoint)
      else if (path === "/reviewee" && request.method === "GET") {
        const urlObj = new URL(request.url);
        const revieweeId = urlObj.searchParams.get("revieweeId");
        const limit = parseInt(urlObj.searchParams.get("limit") || "10"); // Default 10
        const offset = parseInt(urlObj.searchParams.get("offset") || "0"); // Default 0
        
        if (!revieweeId) {
          return new Response(JSON.stringify({ error: "Missing reviewee ID" }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        return getReviewsByRevieweeId(env, revieweeId, corsHeaders, limit, offset);
      }
      
      // Create a new review
      else if (path === "/create" && request.method === "POST") {
        return createReview(request, env, corsHeaders);
      }
      
      // Update an existing review
      else if (path === "/update" && request.method === "PUT") {
        const urlObj = new URL(request.url);
        const id = urlObj.searchParams.get("id");
        
        if (!id) {
          return new Response(JSON.stringify({ error: "Missing review ID" }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        return updateReview(request, env, id, corsHeaders);
      }
      
      // Delete a review
      else if (path === "/delete" && request.method === "DELETE") {
        const urlObj = new URL(request.url);
        const id = urlObj.searchParams.get("id");
        
        if (!id) {
          return new Response(JSON.stringify({ error: "Missing review ID" }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        return deleteReview(env, id, corsHeaders);
      }

      // Route not found
      return new Response(JSON.stringify({ error: "Route not found" }), { 
        status: 404,
        headers: corsHeaders
      });
    } catch (err) {
      // Handle any errors with proper type casting
      const error = err as Error;
      return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};

// CORS handler for preflight requests
function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Get all reviews with pagination
async function getAllReviews(env: Env, headers: HeadersInit, limit: number, offset: number): Promise<Response> {
  // Get total count for pagination info
  const countResult = await env.PETSITTER_DB.prepare("SELECT COUNT(*) as total FROM review").first();
  const total = countResult ? (countResult.total as number) : 0;
  
  const { results } = await env.PETSITTER_DB.prepare(
    "SELECT * FROM review ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).bind(limit, offset).all();
  
  return new Response(JSON.stringify({
    reviews: results,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + results.length < total
    }
  }), {
    status: 200,
    headers
  });
}

// Get a review by ID
async function getReviewById(env: Env, id: string, headers: HeadersInit): Promise<Response> {
  const review = await env.PETSITTER_DB.prepare(
    "SELECT * FROM review WHERE review_id = ?"
  ).bind(id).first();
  
  if (!review) {
    return new Response(JSON.stringify({ error: "Review not found" }), {
      status: 404,
      headers
    });
  }
  
  return new Response(JSON.stringify({ review }), {
    status: 200,
    headers
  });
}

// Get reviews by reviewer ID with pagination
async function getReviewsByReviewerId(env: Env, reviewerId: string, headers: HeadersInit, limit: number, offset: number): Promise<Response> {
  // Get total count for this reviewer
  const countResult = await env.PETSITTER_DB.prepare(
    "SELECT COUNT(*) as total FROM review WHERE reviewer_id = ?"
  ).bind(reviewerId).first();
  const total = countResult ? (countResult.total as number) : 0;
  
  const { results } = await env.PETSITTER_DB.prepare(
    "SELECT * FROM review WHERE reviewer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).bind(reviewerId, limit, offset).all();
  
  return new Response(JSON.stringify({
    reviews: results,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + results.length < total
    }
  }), {
    status: 200,
    headers
  });
}

// Get reviews by reviewee ID with pagination
async function getReviewsByRevieweeId(env: Env, revieweeId: string, headers: HeadersInit, limit: number, offset: number): Promise<Response> {
  // Get total count for this reviewee
  const countResult = await env.PETSITTER_DB.prepare(
    "SELECT COUNT(*) as total FROM review WHERE reviewee_id = ?"
  ).bind(revieweeId).first();
  
  const total = countResult ? (countResult.total as number) : 0;
  
  // Get sum of ratings for this reviewee
  const ratingResult = await env.PETSITTER_DB.prepare(
    "SELECT SUM(rating) as sum_rating FROM review WHERE reviewee_id = ?"
  ).bind(revieweeId).first();
  
  const sumRating = ratingResult ? (ratingResult.sum_rating as number) : 0;
  
  // Update the petsitter table with new totals
  await env.PETSITTER_DB.prepare(
    "UPDATE petsitter SET total_reviews = ?, sum_of_rating = ? WHERE user_id = ?"
  ).bind(total, sumRating, revieweeId).run();
  
  // Modified query to join with the User table
  const { results } = await env.PETSITTER_DB.prepare(
    `SELECT review.*, user.username, user.profile_image_url
     FROM review 
     JOIN user ON review.reviewer_id = user.user_id 
     WHERE reviewee_id = ? 
     ORDER BY review.created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(revieweeId, limit, offset).all();
  
  return new Response(JSON.stringify({
    reviews: results,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + results.length < total
    }
  }), {
    status: 200,
    headers
  });
}

// Create a new review
async function createReview(request: Request, env: Env, headers: HeadersInit): Promise<Response> {
  // Parse request body with proper type annotation
  const data = await request.json() as ReviewData;
  
  // Validate required fields
  const requiredFields = ['reviewer_id', 'reviewee_id', 'rating', 'comment'] as const;
  for (const field of requiredFields) {
    if (!data[field]) {
      return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
        status: 400,
        headers
      });
    }
  }
  
  // Validate rating is between 1 and 5
  if (data.rating && (data.rating < 1 || data.rating > 5)) {
    return new Response(JSON.stringify({ error: "Rating must be between 1 and 5" }), {
      status: 400,
      headers
    });
  }
  
  const now = new Date().toISOString();
  
  // Generate a UUID-like ID for reviews
  const reviewId = `uuid-review${Date.now()}`;
  
  // TypeScript knows these values exist due to our validation above
  const stmt = env.PETSITTER_DB.prepare(`
    INSERT INTO review (review_id, reviewer_id, reviewee_id, rating, comment, created_at, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    reviewId, 
    data.reviewer_id as string,
    data.reviewee_id as string,
    data.rating as number, 
    data.comment as string, 
    now, 
    now
  );
  
  await stmt.run();
  
  return new Response(JSON.stringify({ 
    message: "Review created successfully", 
    review: {
      review_id: reviewId,
      reviewer_id: data.reviewer_id,
      reviewee_id: data.reviewee_id,
      rating: data.rating,
      comment: data.comment,
      created_at: now,
      last_updated: now
    }
  }), {
    status: 201,
    headers
  });
}

// Update an existing review
async function updateReview(request: Request, env: Env, id: string, headers: HeadersInit): Promise<Response> {
  // Check if review exists
  const existingReview = await env.PETSITTER_DB.prepare(
    "SELECT * FROM review WHERE review_id = ?"
  ).bind(id).first();
  
  if (!existingReview) {
    return new Response(JSON.stringify({ error: "Review not found" }), {
      status: 404,
      headers
    });
  }
  
  // Parse request body with proper type annotation
  const data = await request.json() as ReviewData;
  
  // Build update query dynamically based on provided fields
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
      return new Response(JSON.stringify({ error: "Rating must be between 1 and 5" }), {
        status: 400,
        headers
      });
    }
    updateFields.push("rating = ?");
    bindValues.push(data.rating);
  }
  
  if (data.comment !== undefined) {
    updateFields.push("comment = ?");
    bindValues.push(data.comment);
  }
  
  if (updateFields.length === 0) {
    return new Response(JSON.stringify({ error: "No fields to update" }), {
      status: 400,
      headers
    });
  }
  
  // Add last_updated timestamp
  const now = new Date().toISOString();
  updateFields.push("last_updated = ?");
  bindValues.push(now);
  
  // Add ID as the final bind value
  bindValues.push(id);
  
  const stmt = env.PETSITTER_DB.prepare(`
    UPDATE review
    SET ${updateFields.join(", ")}
    WHERE review_id = ?
  `).bind(...bindValues);
  
  await stmt.run();
  
  // Fetch the updated review
  const updatedReview = await env.PETSITTER_DB.prepare(
    "SELECT * FROM review WHERE review_id = ?"
  ).bind(id).first();
  
  return new Response(JSON.stringify({ 
    message: "Review updated successfully", 
    review: updatedReview 
  }), {
    status: 200,
    headers
  });
}

// Delete a review
async function deleteReview(env: Env, id: string, headers: HeadersInit): Promise<Response> {
  // Check if review exists
  const existingReview = await env.PETSITTER_DB.prepare(
    "SELECT * FROM review WHERE review_id = ?"
  ).bind(id).first();
  
  if (!existingReview) {
    return new Response(JSON.stringify({ error: "Review not found" }), {
      status: 404,
      headers
    });
  }
  
  await env.PETSITTER_DB.prepare(
    "DELETE FROM review WHERE review_id = ?"
  ).bind(id).run();
  
  return new Response(JSON.stringify({ message: "Review deleted successfully" }), {
    status: 200,
    headers
  });
}