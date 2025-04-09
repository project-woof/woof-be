export const websocketHandler = async (
	request: Request,
	env: Env,
): Promise<Response> => {
	const url = new URL(request.url);

	if (url.pathname.startsWith("/ws") && request.method === "GET") {
		const userId = url.searchParams.get("user_id");
		if (!userId) {
			return new Response("Missing user_id query parameter", { status: 400 });
		}
		const upgradeHeader = request.headers.get("Upgrade");
		if (!upgradeHeader || upgradeHeader !== "websocket") {
			return new Response(null, {
				status: 426,
				statusText: "Durable Object expected Upgrade: websocket",
				headers: {
					"Content-Type": "text/plain",
				},
			});
		}
		const id = env.PETSITTER_DO.idFromName(userId);
		return env.PETSITTER_DO.get(id).fetch(request);
	}

	return new Response("Websocket API Endpoint Not Found", { status: 404 });
};
