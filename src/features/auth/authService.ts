import { d1Service } from "@/services/d1Service";

export const authService = {
	// Get session and user by token
	getUserByToken: async (token: string, env: Env): Promise<any> => {
		const query = `SELECT 
                        user.*
                    FROM session 
                    JOIN user 
                    ON session.userId = user.id 
                    WHERE token = ?`;
		return await d1Service.executeQuery<any>(query, [token], env);
	},
};
