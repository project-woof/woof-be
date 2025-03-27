import { jwtVerify, createRemoteJWKSet } from "jose";

export async function validateToken(token: string, env: Env) {
	try {
		const JWKS = createRemoteJWKSet(
			new URL(`${env.BETTER_AUTH_URL}/api/auth/jwks`)
		);
		const { payload } = await jwtVerify(token, JWKS, {
			issuer: env.BETTER_AUTH_URL,
			audience: env.BETTER_AUTH_URL,
		});
		return payload;
	} catch (error) {
		console.error("Token validation failed:", error);
		throw error;
	}
}
