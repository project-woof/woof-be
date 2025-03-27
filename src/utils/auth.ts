import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import { jwt, bearer } from "better-auth/plugins";

export interface Env {
	PETSITTER_DB: D1Database;
	BETTER_AUTH_URL?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
}

let auth: ReturnType<typeof betterAuth>;
export function serverAuth(env: Env) {
	if (!auth) {
		auth = betterAuth({
			database: {
				dialect: new D1Dialect({
					database: env.PETSITTER_DB,
				}),
				type: "sqlite",
			},
			baseURL: env.BETTER_AUTH_URL,
			socialProviders: {
				google: {
					clientId: env.GOOGLE_CLIENT_ID!,
					clientSecret: env.GOOGLE_CLIENT_SECRET!,
				},
			},
			plugins: [jwt(), bearer()],
		});
	}
	return auth;
}
