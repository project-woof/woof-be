import { DurableObject } from "cloudflare:workers";

type PollType = "messages" | "notifications";

export class PetsitterDO extends DurableObject<Env> {
	// In case of multiple tabs or duplicate requests, use array
	waiting: Record<PollType, Array<(response: Response) => void>> = {
		messages: [],
		notifications: [],
	};

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.waiting = {
			messages: [],
			notifications: [],
		};
	}

	async handlePollRequest(type: PollType): Promise<Response> {
		const signal = { updated: false, type };
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				this.waiting[type] = this.waiting[type].filter((r) => r !== resolve);
				resolve(
					new Response(JSON.stringify(signal), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					})
				);
			}, 30000); // Return response after timeout of 30s

			// Create a callback that clears the timeout when data is received
			const wrappedResolve = (response: Response) => {
				clearTimeout(timeout);
				resolve(response);
			};

			// Enqueue the wrapped resolve function
			this.waiting[type].push(wrappedResolve);
		});
	}

	async handleNewData(type: PollType): Promise<Response> {
		const signal = { updated: true, type };
		// Notify all waiting requests for this poll type
		while (this.waiting[type].length) {
			const responder = this.waiting[type].shift();
			if (responder) {
				responder(
					new Response(JSON.stringify(signal), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					})
				);
			}
		}
		return new Response("Trigger delivered.", { status: 200 });
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// Validate pathname
		if (pathname.startsWith("/poll/")) {
			const rawType = pathname.split("/")[2];
			if (rawType !== "messages" && rawType !== "notifications") {
				return new Response("Invalid poll type", { status: 400 });
			}
			const type = rawType as PollType;
			return this.handlePollRequest(type);
		} else if (pathname.startsWith("/new/")) {
			const rawType = pathname.split("/")[2];
			if (rawType !== "messages" && rawType !== "notifications") {
				return new Response("Invalid new data type", { status: 400 });
			}
			const type = rawType as PollType;
			return this.handleNewData(type);
		}

		return new Response("Not Found", { status: 404 });
	}
}
