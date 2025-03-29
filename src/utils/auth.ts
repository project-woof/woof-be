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
			user: {
				modelName: "user",
				fields: {
					id: "user_id",
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
