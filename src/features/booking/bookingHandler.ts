import { bookingService } from "./bookingService";

export const bookingHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Get booking by booking_id
	if (
		url.pathname.startsWith("/booking/getBooking") &&
		request.method === "GET"
	) {
		const bookingId = url.pathname.split("/").pop();
		if (!bookingId) {
			return new Response("Booking ID is required", { status: 400 });
		}
		const booking = await bookingService.getBookingById(bookingId, env);
		if (booking.length === 0) {
			return new Response("Booking Not Found", { status: 404 });
		}
		return new Response(JSON.stringify(booking), { status: 200 });
	}

	// Get all bookings by user_id with pagination
	if (
		url.pathname.startsWith("/booking/getBookings") &&
		request.method === "GET"
	) {
		const userId = url.searchParams.get("user-id");
		if (!userId) {
			return new Response("Unauthorized", { status: 401 });
		}
		const limit = parseInt(url.searchParams.get("limit") || "10");
		const offset = parseInt(url.searchParams.get("offset") || "0");
		const bookings = await bookingService.getBookingsByUserId(
			userId,
			limit,
			offset,
			env
		);
		if (bookings.length === 0) {
			return new Response("User Not Found", { status: 404 });
		}
		const total = bookings.length > 0 ? (bookings[0].total as number) : 0;
		return new Response(
			JSON.stringify({
				bookings: bookings.map(({ total, user_exists, ...booking }) => booking),
				pagination: {
					total,
					limit,
					offset,
					hasMore: offset + bookings.length < total,
				},
			}),
			{ status: 200 }
		);
	}

	// Create a new booking
	if (
		url.pathname.startsWith("/booking/createBooking") &&
		request.method === "POST"
	) {
		try {
			const body = await request.json();
			const booking = await bookingService.createBooking(body, env);
			if (booking.length === 0) {
				return new Response("Booking Not Created", { status: 400 });
			}
			return new Response(JSON.stringify(booking), { status: 201 });
		} catch (error: unknown) {
			console.error("Error creating booking:", error);
			if (error instanceof Error) {
				if (error.message.includes("foreign key constraint failed")) {
					return new Response(
						JSON.stringify({ error: "Petowner or Petsitter not found" }),
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

	// Delete a booking
	if (
		url.pathname.startsWith("/booking/deleteBooking") &&
		request.method === "DELETE"
	) {
		const bookingId = url.pathname.split("/").pop();
		if (!bookingId) {
			return new Response("Booking ID is required", { status: 400 });
		}
		const booking = await bookingService.deleteBooking(bookingId, env);
		if (booking[0].changes === 0) {
			return new Response("Booking Not Found", { status: 404 });
		}
		return new Response(JSON.stringify(booking), { status: 200 });
	}

	// Booking API Endpoint Not Found
	return new Response("Booking API Endpoint Not Found", { status: 404 });
};
