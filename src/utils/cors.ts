interface CORSOptions {
	allowedOrigins?: string[];
	allowedMethods?: string[];
	allowedHeaders?: string[];
}

export const handleCORS = (
	request: Request,
	options: CORSOptions = {}
): Response => {
	const origin = request.headers.get("Origin");

	const allowedOrigins = options.allowedOrigins || ["*"]; // TODO: Replace allowed origins
	const allowedMethods = options.allowedMethods || [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"OPTIONS",
	];
	const allowedHeaders = options.allowedHeaders || [
		"Content-Type",
		"Authorization",
	];

	const isAllowedOrigin =
		allowedOrigins.includes("*") || allowedOrigins.includes(origin || "");

	const headers: Headers = new Headers(request.headers);
	headers.set(
		"Access-Control-Allow-Origin",
		isAllowedOrigin ? origin || "*" : ""
	);
	headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
	headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
	headers.set("Access-Control-Allow-Credentials", "true");

	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers,
		});
	}

	return new Response(null, { headers });
};

export const addCORSHeaders = (
	response: Response,
	corsResponse: Response
): Response => {
	const headers = new Headers(response.headers);

	const corsHeaderKeys = [
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Methods",
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Credentials",
		"Access-Control-Expose-Headers",
		"Access-Control-Max-Age",
	];

	corsHeaderKeys.forEach((key) => {
		if (corsResponse.headers.has(key)) {
			headers.set(key, corsResponse.headers.get(key)!);
		}
	});

	return new Response(response.body, { status: response.status, headers });
};
