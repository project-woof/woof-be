export const pollHandler = async (
	request: Request,
	env: Env
): Promise<Response> => {
	const url = new URL(request.url);

	// Send poll requests and new data to Petsitter DO
	if (
		(url.pathname.startsWith("/poll/") || url.pathname.startsWith("/new/")) &&
		request.method === "GET"
	) {
		const userId = url.searchParams.get("user_id");
		if (!userId) {
			return new Response("Missing user_id query parameter", { status: 400 });
		}
		const id = env.PETSITTER_DO.idFromName(userId);
		return env.PETSITTER_DO.get(id).fetch(request);
	}

	return new Response("Polling API Endpoint Not Found", { status: 404 });
};
