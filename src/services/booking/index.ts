/// <reference types="@cloudflare/workers-types" />

import { v7 as uuidv7 } from "uuid";

export interface Env {
	PETSITTER_DB: D1Database;
}

interface BookingData {
	petsitter_id?: string;
	petowner_id?: string;
	start_date?: string;
	end_date?: string;
}

export default {
	async fetch(
		request: Request,
		env: Env
		// ctx: ExecutionContext
	): Promise<Response> {
		if (request.method === "OPTIONS") {
			return handleCors();
		}

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Content-Type": "application/json",
		};

		const url = new URL(request.url);

		try {
			// Health check endpoint
			if (url.pathname === "/health") {
				const healthData = {
					status: "ok",
					timestamp: new Date().toISOString(),
				};
				return new Response(JSON.stringify(healthData), {
					status: 200,
					headers: corsHeaders,
				});
			} else if (url.pathname === "/get" && request.method === "GET") {
				const urlObj = new URL(request.url);
				const bookingId = urlObj.searchParams.get("bookingId");

				if (bookingId) {
					return getBookingById(env, corsHeaders, bookingId);
				}

				const userId = urlObj.searchParams.get("userId");
				const limit = parseInt(urlObj.searchParams.get("limit") || "10"); // Default 10
				const offset = parseInt(urlObj.searchParams.get("offset") || "0"); // Default 0

				if (!userId) {
					return new Response(JSON.stringify({ error: "Missing user ID" }), {
						status: 400,
						headers: corsHeaders,
					});
				}

				return getBookingsByUserId(env, corsHeaders, userId, limit, offset);
			} else if (url.pathname === "/create" && request.method === "POST") {
				return createBooking(env, corsHeaders, request);
			} else if (url.pathname === "/delete" && request.method === "DELETE") {
				const urlObj = new URL(request.url);
				const id = urlObj.searchParams.get("id");

				if (!id) {
					return new Response(JSON.stringify({ error: "Missing booking ID" }), {
						status: 400,
						headers: corsHeaders,
					});
				}

				return deleteBooking(env, corsHeaders, id);
			}

			return new Response("Booking Service: Route not found", {
				status: 404,
				headers: corsHeaders,
			});
		} catch (err) {
			const error = err as Error;
			return new Response(
				JSON.stringify({ error: error.message || "Internal Server Error" }),
				{
					status: 500,
					headers: corsHeaders,
				}
			);
		}
	},
};

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

// Get all bookings by user_id with pagination
async function getBookingsByUserId(
	env: Env,
	headers: HeadersInit,
	userId: string,
	limit: number,
	offset: number
): Promise<Response> {
	const { results } = await env.PETSITTER_DB.prepare(
		`SELECT 
			(CASE WHEN EXISTS (SELECT 1 FROM user WHERE user_id = ?) THEN 1 ELSE 0 END) AS user_exists,
			COUNT(*) OVER () AS total,
			booking.*,
			user.profile_image_url,
			user.username
		FROM booking
		JOIN user ON booking.petsitter_id = user.user_id
		WHERE booking.petowner_id = ? 
		ORDER BY booking.created_at DESC 
		LIMIT ? OFFSET ?;
		`
	)
		.bind(userId, userId, limit, offset)
		.all();

	// If no user exists, return 404
	if (results.length === 0 || results[0].user_exists === 0) {
		return new Response(JSON.stringify({ error: "User not found" }), {
			status: 404,
			headers,
		});
	}

	// Extract pagination info
	const total = results.length > 0 ? (results[0].total as number) : 0;

	return new Response(
		JSON.stringify({
			bookings: results.map(({ total, user_exists, ...booking }) => booking), // Remove extra fields
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + results.length < total,
			},
		}),
		{
			status: 200,
			headers,
		}
	);
}

// Get booking by id
async function getBookingById(
	env: Env,
	headers: HeadersInit,
	bookingId: string
): Promise<Response> {
	const { results } = await env.PETSITTER_DB.prepare(
		`
    SELECT * FROM booking WHERE booking_id = ?
  `
	)
		.bind(bookingId)
		.all();

	// If the booking does not exist
	if (results.length === 0) {
		return new Response(JSON.stringify({ error: "Booking not found" }), {
			status: 404,
			headers,
		});
	}

	return new Response(JSON.stringify({ booking: results[0] }), {
		status: 200,
		headers,
	});
}

// Create a new booking
async function createBooking(
	env: Env,
	headers: HeadersInit,
	request: Request
): Promise<Response> {
	// Parse request body with proper type annotation
	const data = (await request.json()) as BookingData;

	// Validate required fields
	const requiredFields = [
		"petsitter_id",
		"petowner_id",
		"start_date",
		"end_date",
	] as const;
	for (const field of requiredFields) {
		if (!data[field]) {
			return new Response(
				JSON.stringify({ error: `Missing required field: ${field}` }),
				{
					status: 400,
					headers,
				}
			);
		}
	}

	// Check if petowner exists
	const { results: isPetowner } = await env.PETSITTER_DB.prepare(
		`
    SELECT 1 FROM user WHERE user_id = ?
  `
	)
		.bind(data.petowner_id)
		.all();

	if (isPetowner.length === 0) {
		return new Response(JSON.stringify({ error: "Petowner not found" }), {
			status: 404,
			headers,
		});
	}
	// Check if petowner exists
	const { results: isPetsitter } = await env.PETSITTER_DB.prepare(
		`
    SELECT 1 FROM user WHERE user_id = ?
  `
	)
		.bind(data.petsitter_id)
		.all();

	if (isPetsitter.length === 0) {
		return new Response(JSON.stringify({ error: "Petsitter not found" }), {
			status: 404,
			headers,
		});
	}

	const id = `booking_${uuidv7().replace(/-/g, "")}`;

	await env.PETSITTER_DB.prepare(
		`
    INSERT INTO booking (booking_id, petowner_id, petsitter_id, start_date, end_date)
    VALUES (?, ?, ?, ?, ?)
  `
	)
		.bind(
			id,
			data.petowner_id,
			data.petsitter_id,
			data.start_date,
			data.end_date
		)
		.run();

	return new Response(
		JSON.stringify({ message: "Booking created successfully" }),
		{
			status: 201,
			headers,
		}
	);
}

// Delete a booking
async function deleteBooking(
	env: Env,
	headers: HeadersInit,
	bookingId: string
): Promise<Response> {
	// Check if booking exists
	const { results } = await env.PETSITTER_DB.prepare(
		`
    SELECT 1 FROM booking WHERE booking_id = ?
  `
	)
		.bind(bookingId)
		.all();

	if (results.length === 0) {
		return new Response(JSON.stringify({ error: "Booking not found" }), {
			status: 404,
			headers,
		});
	}

	// Delete the booking
	await env.PETSITTER_DB.prepare(
		`
    DELETE FROM booking WHERE booking_id = ?
  `
	)
		.bind(bookingId)
		.run();

	return new Response(
		JSON.stringify({ message: "Booking deleted successfully" }),
		{
			status: 200,
			headers,
		}
	);
}
