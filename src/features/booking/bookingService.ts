import { d1Service } from "@/services/d1Service";
import { generateUUID } from "@/utils/uuid";
import type { Booking } from "@/types/bookingTypes";

export const bookingService = {
	// Get booking by booking_id
	getBookingById: async (bookingId: string, env: Env): Promise<any> => {
		const query = "SELECT * FROM booking WHERE booking_id = ?";
		return await d1Service.executeQuery<Booking>(query, [bookingId], env);
	},

	// Get all bookings by petowner_id with pagination
	getBookingsByPetownerId: async (
		petowner_id: string,
		limit: number,
		offset: number,
		env: Env
	): Promise<any[]> => {
		const query = `
		  SELECT 
			booking.*,
			user.profile_image_url,
			user.username
		  FROM booking
		  JOIN user ON booking.petsitter_id = user.id
		  WHERE booking.petowner_id = ?
		  ORDER BY booking.created_at DESC 
		  LIMIT ? OFFSET ?;`;
		return await d1Service.executeQuery<Booking>(
			query,
			[petowner_id, limit, offset],
			env
		);
	},

	// Get all bookings by petowner_id with pagination
	getBookingsByPetsitterId: async (
		petsitter_id: string,
		limit: number,
		offset: number,
		env: Env
	): Promise<any[]> => {
		const query = `
		  SELECT 
			booking.*,
			user.profile_image_url,
			user.username
		  FROM booking
		  JOIN user ON booking.petowner_id = user.id
		  WHERE booking.petsitter_id = ?
		  ORDER BY booking.created_at DESC 
		  LIMIT ? OFFSET ?;`;
		return await d1Service.executeQuery<Booking>(
			query,
			[petsitter_id, limit, offset],
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
		return await d1Service.executeQuery<Booking>(query, [bookingId], env);
	},
};
