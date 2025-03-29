import { d1Service } from "@/services/d1Service";
import { generateUUID } from "@/utils/uuid";

export const bookingService = {
	// Get booking by booking_id
	getBookingById: async (bookingId: string, env: Env): Promise<any> => {
		const query = "SELECT * FROM booking WHERE booking_id = ?";
		return await d1Service.executeQuery(query, [bookingId], env);
	},

	// Get all bookings by user_id with pagination
	getBookingsByUserId: async (
		userId: string,
		limit: number,
		offset: number,
		env: Env
	): Promise<any[]> => {
		const query = `
		SELECT 
			(CASE WHEN EXISTS (SELECT 1 FROM user WHERE user_id = ?) THEN 1 ELSE 0 END) AS user_exists,
			COUNT(*) OVER () AS total,
			booking.*,
			user.profile_image_url,
			user.username
		FROM booking
		JOIN user ON booking.petsitter_id = user.user_id
		WHERE booking.petowner_id = ? 
		ORDER BY booking.created_at DESC 
		LIMIT ? OFFSET ?;`;
		return await d1Service.executeQuery(
			query,
			[userId, userId, limit, offset],
			env
		);
	},

	// Create a new booking
	createBooking: async (body: any, env: Env): Promise<any> => {
		const booking_id = generateUUID("booking");
		const { petowner_id, petsitter_id, start_date, end_date } = body;
		const query = `
		INSERT INTO booking (booking_id, petowner_id, petsitter_id, start_date, end_date)
		VALUES (?, ?, ?, ?, ?) RETURNING *;`;
		try {
			return await d1Service.executeQuery(
				query,
				[booking_id, petowner_id, petsitter_id, start_date, end_date],
				env
			);
		} catch (error) {
			console.error("Error inserting booking:", error);
			throw error;
		}
	},

	// Delete a booking
	deleteBooking: async (bookingId: string, env: Env): Promise<any> => {
		const query = "DELETE FROM booking WHERE booking_id = ?";
		return await d1Service.executeQuery(query, [bookingId], env);
	},
};
