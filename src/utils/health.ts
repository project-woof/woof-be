export const healthCheck = async (env: Env): Promise<Response> => {
	try {
		await env.PETSITTER_DB.prepare("SELECT 1").first();
		return new Response("Worker is healthy", { status: 200 });
	} catch (error) {
		console.error("Health check failed:", error);
		return new Response("Health check failed", { status: 500 });
	}
};
