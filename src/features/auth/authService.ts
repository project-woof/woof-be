import { d1Service } from "@/services/d1Service";

export const authService = {
	signUpUser: async (
		username: string,
		passwordHash: string,
		env: Env
	): Promise<boolean> => {
		const query = `INSERT INTO users (username, password_hash) VALUES (?, ?);`;
		try {
			await d1Service.executeQuery(query, [username, passwordHash], env);
			return true;
		} catch (error) {
			console.error("Error creating user:", error);
			return false;
		}
	},

	getUserByUsername: async (
		username: string,
		env: Env
	): Promise<any | null> => {
		const query = `SELECT id, username, password_hash FROM users WHERE username = ?;`;
		const result = await d1Service.executeQuery<any>(query, [username], env);
		return result.length > 0 ? result[0] : null;
	},
};
