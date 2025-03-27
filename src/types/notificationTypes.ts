export interface CreateBookingRequestBody {
	userId: string;
	message: string;
}

export interface CreateBookingResponse {
	bookingId: string;
	createdAt: string;
}
