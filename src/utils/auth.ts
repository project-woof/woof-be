import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import { jwt, bearer } from "better-auth/plugins";

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
					redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`!,
				},
			},
			plugins: [jwt(), bearer()],
		});
	}
	return auth;
}
