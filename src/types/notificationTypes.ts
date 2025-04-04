export interface Notification {
	notification_id: string;
	user_id: string;
	sender_id: string;
	room_id: string;
	notification_type: string;
	count: number;
	created_at: string;
	last_updated: string;
}