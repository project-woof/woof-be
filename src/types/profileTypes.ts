export interface UserProfile {
	user_id?: string;
	username: string;
	email: string;
	profile_image_url?: string;
	latitude?: number;
	longitude?: number;
	description?: string;
	is_petsitter?: number;
	created_at?: string;
	last_updated?: string;
}
