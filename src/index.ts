import { env } from "cloudflare:workers";
import { handleRequest } from "@/routes/routes";
import { serverAuth } from "@/utils/auth";
export { PetsitterDO } from "@/services/doService";

export default {
	async fetch(request: Request, ctx: ExecutionContext): Promise<Response> {
		const auth = serverAuth(env);
		return handleRequest(request, env, auth);
	},
};
