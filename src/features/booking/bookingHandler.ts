import { bookingService } from "./bookingService";

export const bookingHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Get booking by booking_id
	if (
		url.pathname.startsWith("/booking/getBooking/") &&
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
		return new Response(JSON.stringify(booking[0]), { status: 200 });
	}

	// Get all bookings by petowner_id with pagination
	if (
		url.pathname.startsWith("/booking/getBookings/petowner") &&
		request.method === "GET"
	) {
		const petownerId = url.searchParams.get("id");
		if (!petownerId) {
			return new Response("Petowner Not Found", { status: 404 });
		}
		const limit = parseInt(url.searchParams.get("limit") || "10");
		const offset = parseInt(url.searchParams.get("offset") || "0");
		const bookings = await bookingService.getBookingsByPetownerId(
			petownerId,
			limit,
			offset,
			env
		);
		return new Response(JSON.stringify(bookings), { status: 200 });
	}

	// Get all bookings by petowner_id with pagination
	if (
		url.pathname.startsWith("/booking/getBookings/petsitter") &&
		request.method === "GET"
	) {
		const petsitterId = url.searchParams.get("id");
		if (!petsitterId) {
			return new Response("Petsitter Not Found", { status: 404 });
		}
		const limit = parseInt(url.searchParams.get("limit") || "10");
		const offset = parseInt(url.searchParams.get("offset") || "0");
		const bookings = await bookingService.getBookingsByPetsitterId(
			petsitterId,
			limit,
			offset,
			env
		);
		return new Response(JSON.stringify(bookings), { status: 200 });
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
			return new Response(JSON.stringify(booking[0]), { status: 201 });
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
		url.pathname.startsWith("/booking/deleteBooking/") &&
		request.method === "DELETE"
	) {
		const bookingId = url.pathname.split("/").pop();
		if (!bookingId) {
			return new Response("Booking ID is required", { status: 400 });
		}
		const booking = await bookingService.deleteBooking(bookingId, env);
		if (booking.length === 0) {
			return new Response("Booking Not Found", { status: 404 });
		}
		return new Response("Booking Deleted", { status: 200 });
	}

	// Booking API Endpoint Not Found
	return new Response("Booking API Endpoint Not Found", { status: 404 });
};
