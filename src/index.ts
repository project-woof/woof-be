import { handleRequest } from "./routes/routes";

addEventListener("fetch", (event: FetchEvent) => {
	const env = event.target as unknown as Env;
	event.respondWith(handleRequest(event.request, env));
});
