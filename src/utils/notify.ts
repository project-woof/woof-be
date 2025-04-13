export function notifyLongPoll(
	env: Env,
	userId: string,
	pollType: "messages" | "notifications"
): Promise<Response> {
	const id = env.PETSITTER_DO.idFromName(userId);
	const url = new URL(
		`/new/${pollType}?user_id=${encodeURIComponent(userId)}`,
		"https://dummy"
	);
	return env.PETSITTER_DO.get(id).fetch(
		new Request(url.toString(), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		})
	);
}
