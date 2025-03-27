import { profileService } from "./profileService";
import type { UserProfile } from "@/types/profileTypes";

export const profileHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// GET profile by user ID via query parameter
	if (url.pathname === "/profile/getProfile" && request.method === "GET") {
		const userId = url.searchParams.get("id");
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const profile = await profileService.getProfileById(userId, env);
		if (!profile) {
			return new Response("Profile not found", { status: 404 });
		}
		return new Response(JSON.stringify(profile), { status: 200 });
	}

	// Create a new profile
	if (url.pathname === "/profile/createProfile" && request.method === "POST") {
		try {
			const body = await request.json();
			const profile = await profileService.createProfile(body, env);
			if (!profile) {
				return new Response("Profile not created", { status: 400 });
			}
			return new Response(JSON.stringify(profile), { status: 201 });
		} catch (error: unknown) {
			console.error("Error creating profile:", error);
			return new Response(
				JSON.stringify({ error: "An unexpected error occurred" }),
				{ status: 500 }
			);
		}
	}

	// Update an existing profile
	if (url.pathname === "/profile/updateProfile" && request.method === "PUT") {
		try {
			const body = (await request.json()) as Partial<UserProfile>;
			// Expect body to contain a user_id and fields to update
			const { user_id } = body;
			if (!user_id) {
				return new Response("User ID is required", { status: 400 });
			}
			const success = await profileService.updateProfile(user_id, body, env);
			return success
				? new Response("Profile updated", { status: 200 })
				: new Response("Error updating profile", { status: 500 });
		} catch (error: unknown) {
			console.error("Error updating profile:", error);
			return new Response(
				JSON.stringify({ error: "An unexpected error occurred" }),
				{ status: 500 }
			);
		}
	}

	// Delete a profile by user ID via query parameter (e.g. /profile/deleteProfile?id=USER_ID)
	if (
		url.pathname === "/profile/deleteProfile" &&
		request.method === "DELETE"
	) {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const profile = await profileService.deleteProfile(userId, env);
		if (profile[0].changes === 0) {
			return new Response("Profile not found", { status: 404 });
		}
		return new Response(JSON.stringify(profile), { status: 200 });
	}

	// Profile API Endpoint Not Found
	return new Response("Profile API Endpoint Not Found", { status: 404 });
};
