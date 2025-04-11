import { profileService } from "./profileService";
import type { PetsitterProfile } from "@/types/profileTypes";

export const profileHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// GET profile by user ID
	if (
		url.pathname.startsWith("/profile/getProfile/") &&
		request.method === "GET"
	) {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const profile = await profileService.getProfileById(userId, env);
		if (profile.length === 0) {
			return new Response("Profile not found", { status: 404 });
		}
		return new Response(JSON.stringify(profile[0]), { status: 200 });
	}

	// Get petsitter profile by user ID
	if (
		url.pathname.startsWith("/profile/getPetsitterProfile/") &&
		request.method === "GET"
	) {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const { searchParams } = new URL(request.url);
		const DEFAULT_USER_LAT = 37.7749; // San Francisco (Golden Gate City :O)
		const DEFAULT_USER_LON = -122.4194;

		// Get latitude and longitude from query parameters
		const userLat = parseFloat(
			searchParams.get("userLat") ?? DEFAULT_USER_LAT.toString()
		);
		const userLon = parseFloat(
			searchParams.get("userLon") ?? DEFAULT_USER_LON.toString()
		);
		
		const petsitterProfile = await profileService.getPetsitterProfileById(
			userLat,
			userLon,
			userId,
			env
		);
		if (petsitterProfile.length === 0) {
			return new Response("Petsitter Profile not found", { status: 404 });
		}
		return new Response(JSON.stringify(petsitterProfile[0]), { status: 200 });
	}

	// Get list of petsitters
	if (
		url.pathname.startsWith("/profile/getPetsitterList") &&
		request.method === "GET"
	) {
		const { searchParams } = new URL(request.url);
		const DEFAULT_USER_LAT = 37.7749; // San Francisco (Golden Gate City :O)
		const DEFAULT_USER_LON = -122.4194;

		// Get latitude and longitude from query parameters
		const userLat = parseFloat(
			searchParams.get("userLat") ?? DEFAULT_USER_LAT.toString()
		);
		const userLon = parseFloat(
			searchParams.get("userLon") ?? DEFAULT_USER_LON.toString()
		);
		const limit = parseInt(searchParams.get("limit") ?? "15", 10);
		const offset = parseInt(searchParams.get("offset") ?? "0", 10);

		try {
			const petsitters = await profileService.getPetsitterList(
				userLat,
				userLon,
				limit,
				offset,
				env
			);
			return new Response(JSON.stringify(petsitters), {
				status: 200,
			});
		} catch (error) {
			console.error("Error handling /profile/getPetsitters:", error);
			return new Response("Internal Server Error", { status: 500 });
		}
	}

	// TODO: Replace with createPetsitter (auth handles user creation)
	// Create a new profile
	if (
		url.pathname.startsWith("/profile/createProfile") &&
		request.method === "POST"
	) {
		try {
			const body = await request.json();
			const profile = await profileService.createProfile(body, env);
			if (profile.length === 0) {
				return new Response("Profile not created", { status: 400 });
			}
			return new Response(JSON.stringify(profile[0]), { status: 201 });
		} catch (error: unknown) {
			console.error("Error creating profile:", error);
			return new Response(
				JSON.stringify({ error: "An unexpected error occurred" }),
				{ status: 500 }
			);
		}
	}

	// Update an existing profile
	if (
		url.pathname.startsWith("/profile/updateProfile") &&
		request.method === "PUT"
	) {
		try {
			const body = (await request.json()) as Partial<PetsitterProfile>;
			// Expect body to contain a user_id and fields to update
			const { id } = body;
			if (!id) {
				return new Response("User ID is required", { status: 400 });
			}
			const success = await profileService.updateProfile(id, body, env);
			return success
				? new Response("Profile updated", { status: 201 })
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
		url.pathname.startsWith("/profile/deleteProfile/") &&
		request.method === "DELETE"
	) {
		const userId = url.pathname.split("/").pop();
		if (!userId) {
			return new Response("User ID is required", { status: 400 });
		}
		const profile = await profileService.deleteProfile(userId, env);
		if (profile.length === 0) {
			return new Response("Profile not found", { status: 404 });
		}
		return new Response("Profile Deleted", { status: 200 });
	}

	// Profile API Endpoint Not Found
	return new Response("Profile API Endpoint Not Found", { status: 404 });
};
