import { DurableObject } from "cloudflare:workers";
import { chatService } from "@/features/chat/chatService";

export class PetsitterDO extends DurableObject<Env> {
	connection: WebSocket | null = null;
	userId: string = "";

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.ctx.storage.setAlarm(Date.now() + 60000);
	}

	async alarm(): Promise<void> {
		// Check if connection is still alive
		if (this.connection && this.connection.readyState === WebSocket.OPEN) {
			try {
				this.connection.send(JSON.stringify({ type: "heartbeat" }));
				// Schedule the next alarm
				this.ctx.storage.setAlarm(Date.now() + 60000);
			} catch (error) {
				console.error("Error sending heartbeat, closing connection:", error);
				try {
					this.connection.close(1011, "Heartbeat failed");
				} catch (e) {
					console.error("Error closing connection:", e);
				}
				this.connection = null;
			}
		}
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const queryUserId = url.searchParams.get("user_id");
		if (queryUserId) {
			this.userId = queryUserId;
		}

		const upgradeHeader = request.headers.get("Upgrade");
		if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
			// Create a WebSocket pair.
			const webSocketPair = new WebSocketPair();
			const [client, server] = Object.values(webSocketPair);
			this.ctx.acceptWebSocket(server);
			this.connection = server;

			server.addEventListener("message", (event) => {
				this.webSocketMessage(server, event.data);
			});
			server.addEventListener("close", (event) => {
				this.webSocketClose(server, event.code, event.reason, event.wasClean);
			});
			server.addEventListener("error", (event: any) => {
				this.webSocketError(server, event.error);
			});
			this.subscribeUser();
			return new Response(null, {
				status: 101,
				webSocket: client,
			});
		} else {
			// Non-WebSocket branch (push notifications).
			let bodyText: string;
			try {
				bodyText = await request.text();
			} catch (e) {
				console.error("Error reading request text:", e);
				return new Response("Bad Request", { status: 400 });
			}
			let data: unknown = {};
			if (bodyText.trim().length > 0) {
				try {
					data = JSON.parse(bodyText);
				} catch (e) {
					console.error("JSON parse error:", e);
					return new Response("Bad Request", { status: 400 });
				}
			}
			if (this.connection) {
				this.connection.send(JSON.stringify(data));
			}
			return new Response("OK", { status: 200 });
		}
	}

	async subscribeUser(): Promise<void> {
		try {
			const query = `
						SELECT room_id FROM chatroom
						WHERE participant1_id = ? OR participant2_id = ?;
					`;
			const result = await this.env.PETSITTER_DB.prepare(query)
				.bind(this.userId, this.userId)
				.all<{ room_id: string }>();
			if (result && result.results) {
				const rooms = result.results.map((r) => r.room_id);
				console.log(
					`User ${this.userId} subscribed to rooms: ${rooms.join(", ")}`
				);
				this.connection?.send(JSON.stringify({ type: "subscribed", rooms }));
			}
		} catch (error) {
			console.error(`Subscription error for user ${this.userId}:`, error);
		}
	}

	async webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer
	): Promise<void> {
		try {
			const text =
				typeof message === "string"
					? message
					: new TextDecoder().decode(message);
			const clientMsg = JSON.parse(text);
			if (clientMsg.action === "send_message") {
				const { room_id, message: content } = clientMsg;
				const query = `
						SELECT participant1_id, participant2_id FROM chatroom
						WHERE room_id = ?;
						`;
				const chatroom = await this.env.PETSITTER_DB.prepare(query)
					.bind(room_id)
					.first<{ participant1_id: string; participant2_id: string }>();
				if (!chatroom) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Chat room not found or unauthorized.",
						})
					);
					return;
				}
				const body = {
					room_id,
					sender_id: this.userId,
					text: content,
				};
				const response = await chatService.addMessageToChatRoom(body, this.env);
				if (!response) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Failed to send message.",
						})
					);
					return;
				}
				const recipientId =
					chatroom.participant1_id === this.userId
						? chatroom.participant2_id
						: chatroom.participant1_id;
				const serverMsg = {
					type: "message",
					room_id,
					message_id: response[0].message_id,
					sender_id: this.userId,
					message: content,
					created_at: response[0].created_at,
				};
				const recipientIdObj = this.env.PETSITTER_DO.idFromName(recipientId);
				await this.env.PETSITTER_DO.get(recipientIdObj).fetch(
					new Request("https://dummy", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(serverMsg),
					})
				);
				ws.send(JSON.stringify({ type: "info", message: "Message sent." }));
			} else if (clientMsg.action === "ping") {
				ws.send(JSON.stringify({ type: "info", message: "pong" }));
			} else {
				ws.send(JSON.stringify({ type: "error", message: "Unknown action." }));
			}
		} catch (error) {
			console.error("Error in webSocketMessage:", error);
			ws.send(JSON.stringify({ type: "error", message: "Internal error." }));
		}
	}

	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean
	): Promise<void> {
		console.log(`WebSocket closed for user ${this.userId}: ${code} ${reason}`);
		if (!wasClean) {
			console.warn(`Abnormal WebSocket closure for user ${this.userId}`);
		}
		this.connection = null;
	}

	async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
		console.error(`WebSocket error for user ${this.userId}:`, error);
		ws.close(1011, "WebSocket error");
		this.connection = null;
	}
}
