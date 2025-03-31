export interface User {
	id: string;
	username: string;
	email: string;
	emailVerified: boolean;
	profile_image_url?: string;
	latitude?: number;
	longitude?: number;
	description?: string;
	is_petsitter?: number;
	created_at: string;
	last_updated: string;
}

export interface Petsitter {
	total_reviews: number;
	sum_of_rating: number;
	price: number;
	petsitter_description: string;
	service_tags: string[];
}

export interface PetsitterProfile extends User, Petsitter {
	user: User;
	petsitter: Petsitter;
}
