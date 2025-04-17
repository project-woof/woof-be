import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { D1Dialect } from "kysely-d1";

// better-auth integration
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
			user: {
				modelName: "user",
				fields: {
					name: "username",
					image: "profile_image_url",
					createdAt: "created_at",
					updatedAt: "last_updated",
				},
				additionalFields: {
					latitude: {
						type: "number",
						required: false,
					},
					longitude: {
						type: "number",
						required: false,
					},
					description: {
						type: "string",
						required: false,
					},
					is_petsitter: {
						type: "number",
						required: false,
						default: 0,
					},
				},
			},
			baseURL:
				env.ENVIRONMENT === "production"
					? env.BETTER_AUTH_URL
					: "http://127.0.0.1:8787",
			socialProviders: {
				google: {
					clientId: env.GOOGLE_CLIENT_ID!,
					clientSecret: env.GOOGLE_CLIENT_SECRET!,
				},
			},
			plugins: [bearer()],
		});
	}
	return auth;
}
