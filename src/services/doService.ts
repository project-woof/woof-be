import { DurableObject } from "cloudflare:workers";
import { chatService } from "@/features/chat/chatService";
import type { ChatMessage } from "@/types/chatTypes";

export class PetsitterDO extends DurableObject<Env> {
	connection: WebSocket | null = null;
	userId: string = "";
	connectionState: "connecting" | "open" | "closing" | "closed" = "closed";
	lastActivity: number = Date.now();

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		// Set up an alarm to check connection health periodically
		this.ctx.storage.setAlarm(Date.now() + 30000);
	}

	async alarm(): Promise<void> {
		// Check if connection is still alive
		if (this.connection && this.connectionState === "open") {
			try {
				// Check if the connection has been inactive for too long
				const inactiveTime = Date.now() - this.lastActivity;

				// Send heartbeat to keep connection alive
				this.safeSend({ type: "heartbeat" });

				// Log if connection has been inactive for a while
				if (inactiveTime > 5 * 60 * 1000) {
					// 5 minutes
					console.log(
						`Connection for user ${this.userId} has been inactive for ${
							inactiveTime / 1000
						} seconds`
					);
				}

				// Schedule the next alarm
				this.ctx.storage.setAlarm(Date.now() + 30000);
			} catch (error) {
				console.error("Error in alarm handler:", error);
				this.cleanupConnection("Heartbeat failed");
			}
		}
	}

	async fetch(request: Request): Promise<Response> {
		console.log(
			`Received request: ${request.method} ${new URL(request.url).pathname}`
		);

		try {
			const url = new URL(request.url);
			const queryUserId = url.searchParams.get("user_id");
			if (queryUserId) {
				this.userId = queryUserId;
				console.log(`User ID: ${this.userId}`);
			}

			const upgradeHeader = request.headers.get("Upgrade");
			if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
				// Create a WebSocket pair
				const webSocketPair = new WebSocketPair();
				const [client, server] = Object.values(webSocketPair);

				// Update connection state
				this.connectionState = "connecting";

				try {
					this.ctx.acceptWebSocket(server);
					this.connection = server;
					this.connectionState = "open";
					this.lastActivity = Date.now();

					console.log(
						`WebSocket connection established for user ${this.userId}`
					);

					server.addEventListener("message", (event) => {
						this.lastActivity = Date.now();
						this.webSocketMessage(server, event.data);
					});

					server.addEventListener("close", (event) => {
						this.connectionState = "closed";
						this.webSocketClose(
							server,
							event.code,
							event.reason,
							event.wasClean
						);
					});

					server.addEventListener("error", (event: any) => {
						this.webSocketError(server, event.error);
					});

					// Subscribe user to chat rooms
					await this.subscribeUser();

					return new Response(null, {
						status: 101,
						webSocket: client,
					});
				} catch (error) {
					console.error(`Error setting up WebSocket:`, error);
					this.connectionState = "closed";
					return new Response("Failed to set up WebSocket connection", {
						status: 500,
					});
				}
			} else {
				// Non-WebSocket branch (push notifications)
				let bodyText: string;
				try {
					bodyText = await request.text();
				} catch (e) {
					console.error(`Error reading request text:`, e);
					return new Response("Bad Request", { status: 400 });
				}

				let data: unknown = {};
				if (bodyText.trim().length > 0) {
					try {
						data = JSON.parse(bodyText);
						console.log(`Received notification data:`, data);
					} catch (e) {
						console.error(`JSON parse error:`, e);
						return new Response("Bad Request", { status: 400 });
					}
				}

				if (this.connection && this.connectionState === "open") {
					this.safeSend(data);
					return new Response("OK", { status: 200 });
				} else {
					console.warn(
						`Attempted to send notification but connection is ${this.connectionState}`
					);
					return new Response("No active connection", { status: 404 });
				}
			}
		} catch (error) {
			console.error(`Unhandled error in fetch:`, error);
			return new Response("Internal Server Error", { status: 500 });
		}
	}

	// Helper method to safely send messages
	safeSend(message: any): void {
		if (!this.connection || this.connectionState !== "open") {
			console.warn(
				`Attempted to send message while connection is ${this.connectionState}`
			);
			return;
		}

		try {
			const messageStr =
				typeof message === "string" ? message : JSON.stringify(message);

			this.connection.send(messageStr);
		} catch (error) {
			console.error("Error sending message:", error);
			this.cleanupConnection("Error sending message");
		}
	}

	// Helper method to clean up connection
	cleanupConnection(reason: string): void {
		if (this.connection) {
			try {
				if (
					this.connectionState !== "closed" &&
					this.connectionState !== "closing"
				) {
					this.connectionState = "closing";
					this.connection.close(1011, reason);
				}
			} catch (closeError) {
				console.error("Error closing connection:", closeError);
			}
			this.connection = null;
			this.connectionState = "closed";
		}
	}

	// Helper method for database operations with retry
	async executeDbQuery<T>(
		operation: () => Promise<T>,
		maxRetries = 3
	): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				console.error(
					`Database operation failed (attempt ${attempt}/${maxRetries}):`,
					error
				);
				lastError = error instanceof Error ? error : new Error(String(error));

				// Wait before retrying (exponential backoff)
				if (attempt < maxRetries) {
					await new Promise((resolve) =>
						setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
					);
				}
			}
		}

		// If we get here, all retries failed
		throw (
			lastError || new Error("Database operation failed after multiple retries")
		);
	}

	async subscribeUser(): Promise<void> {
		if (!this.connection || this.connectionState !== "open") {
			console.warn(
				`Cannot subscribe user ${this.userId}: connection is ${this.connectionState}`
			);
			return;
		}

		try {
			console.log(`Subscribing user ${this.userId} to chat rooms`);
			const query = `
						SELECT room_id FROM chatroom
						WHERE participant1_id = ? OR participant2_id = ?;
					`;

			const result = await this.executeDbQuery(() =>
				this.env.PETSITTER_DB.prepare(query)
					.bind(this.userId, this.userId)
					.all<{ room_id: string }>()
			);

			if (result && result.results) {
				const rooms = result.results.map((r) => r.room_id);
				console.log(
					`User ${this.userId} subscribed to rooms: ${rooms.join(", ")}`
				);
				this.safeSend({ type: "subscribed", rooms });
			} else {
				console.log(`No chat rooms found for user ${this.userId}`);
				this.safeSend({
					type: "subscribed",
					rooms: [],
					message: "No chat rooms found",
				});
			}
		} catch (error) {
			console.error(`Subscription error for user ${this.userId}:`, error);

			// Send a more specific error message
			if (this.connection && this.connectionState === "open") {
				this.safeSend({
					type: "error",
					message:
						"Failed to subscribe to chat rooms. Please try reconnecting.",
				});
			}
		}
	}

	async webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer
	): Promise<void> {
		try {
			// Check connection health first
			if (ws.readyState !== WebSocket.OPEN) {
				console.warn(
					`Received message on non-open WebSocket (state: ${ws.readyState})`
				);
				return;
			}

			const text =
				typeof message === "string"
					? message
					: new TextDecoder().decode(message);

			const clientMsg = JSON.parse(text);

			// Handle ping specially with minimal processing
			if (clientMsg.action === "ping") {
				this.safeSend({ type: "info", message: "pong" });
				return;
			}

			if (clientMsg.action === "send_message") {
				const { room_id, message: content } = clientMsg;

				// Add timeout for database operations
				const dbTimeout = new Promise((_, reject) => {
					setTimeout(
						() => reject(new Error("Database operation timed out")),
						5000
					);
				});

				console.log(`Sending message to room ${room_id} from user ${this.userId}`);

				try {
					// Check if the chat room exists with timeout and retry
					const query = `
								SELECT participant1_id, participant2_id FROM chatroom
								WHERE room_id = ?;
							`;

					const chatroomPromise = this.executeDbQuery(() =>
						this.env.PETSITTER_DB.prepare(query)
							.bind(room_id)
							.first<{ participant1_id: string; participant2_id: string }>()
					);

					const chatroom = (await Promise.race([
						chatroomPromise,
						dbTimeout,
					])) as any;

					if (!chatroom) {
						this.safeSend({
							type: "error",
							message: "Chat room not found or unauthorized.",
						});
						return;
					}

					// Prepare message body
					const body = {
						room_id,
						sender_id: this.userId,
						text: content,
					};

					// Add message to chat room with timeout
					const responsePromise = this.executeDbQuery(() =>
						chatService.addMessageToChatRoom(body, this.env)
					);

					const response = (await Promise.race([
						responsePromise,
						dbTimeout,
					])) as ChatMessage[];

					if (!response) {
						this.safeSend({
							type: "error",
							message: "Failed to send message.",
						});
						return;
					}

					// Determine recipient and create message
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

					// Add timeout for recipient notification
					const notificationTimeout = new Promise((_, reject) => {
						setTimeout(
							() => reject(new Error("Notification delivery timed out")),
							5000
						);
					});

					let recipientNotified = true;

					try {
						// Get recipient's Durable Object
						const recipientIdObj =
							this.env.PETSITTER_DO.idFromName(recipientId);
						const notificationPromise = this.env.PETSITTER_DO.get(
							recipientIdObj
						).fetch(
							new Request("https://dummy", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(serverMsg),
							})
						);

						await Promise.race([notificationPromise, notificationTimeout]);
					} catch (notifyError) {
						console.error(`Failed to notify recipient:`, notifyError);
						recipientNotified = false;
						// Continue anyway - the message is saved in the database
					}

					// Send success response
					this.safeSend({
						type: "info",
						message: "Message sent.",
						recipientNotified,
					});
				} catch (dbError) {
					console.error(`Database or notification error:`, dbError);
					this.safeSend({
						type: "error",
						message:
							dbError instanceof Error
								? `Operation failed: ${dbError.message}`
								: "Operation failed",
					});
				}
			} else {
				this.safeSend({ type: "error", message: "Unknown action." });
			}
		} catch (error) {
			console.error(`Error in webSocketMessage:`, error);
			console.error(
				`Stack trace:`,
				error instanceof Error ? error.stack : "No stack trace"
			);

			// Add more detailed error information
			const errorMessage =
				error instanceof Error
					? `Internal error: ${error.message}`
					: "Internal error";

			try {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: "error", message: errorMessage }));
				}
			} catch (sendError) {
				console.error(`Failed to send error message:`, sendError);
			}
		}
	}

	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean
	): Promise<void> {
		console.log(
			`WebSocket closed for user ${this.userId}: code=${code}, reason="${reason}", wasClean=${wasClean}`
		);

		if (!wasClean) {
			console.warn(`Abnormal WebSocket closure for user ${this.userId}`);
		}

		this.connection = null;
		this.connectionState = "closed";
	}

	async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
		console.error(`WebSocket error for user ${this.userId}:`, error);

		try {
			if (
				ws.readyState !== WebSocket.CLOSED &&
				ws.readyState !== WebSocket.CLOSING
			) {
				ws.close(1011, "WebSocket error");
			}
		} catch (closeError) {
			console.error("Error while closing WebSocket after error:", closeError);
		}

		this.connection = null;
		this.connectionState = "closed";
	}
}
