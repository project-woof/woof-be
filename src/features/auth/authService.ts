import { d1Service } from "@/services/d1Service";
import { User } from "@/types/profileTypes";

export const authService = {
	// Get session and user by token
	getUserByToken: async (token: string, env: Env): Promise<User[]> => {
		const query = `SELECT 
                        user.*
                    FROM session 
                    JOIN user 
                    ON session.userId = user.id 
                    WHERE token = ?`;
		const profile = await d1Service.executeQuery<User>(query, [token], env)

        const enrichedProfile = profile.map((petsitter) => ({
			...petsitter,
			profile_image_url: `${petsitter.id}/profile-image`,
		}));

		return enrichedProfile;
	},
};
