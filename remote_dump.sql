PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "user" ("id" text not null primary key, "username" text not null, "email" text not null unique, "emailVerified" integer not null, "profile_image_url" text, "created_at" date not null, "last_updated" date not null, "latitude" integer, "longitude" integer, "description" text, "is_petsitter" integer);
CREATE TABLE IF NOT EXISTS "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id"));
CREATE TABLE IF NOT EXISTS "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id"), "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
CREATE TABLE IF NOT EXISTS "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date, "updatedAt" date);
CREATE TABLE petsitter (
  id TEXT PRIMARY KEY,
  total_reviews INTEGER DEFAULT 0,
  sum_of_rating REAL DEFAULT 0.0,
  price REAL,
  description TEXT,
  service_tags TEXT, -- JSON array of services e.g., '["Dog sitting", "Long-term care"]'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE booking (
  booking_id TEXT PRIMARY KEY,
  petowner_id TEXT NOT NULL,
  petsitter_id TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(petowner_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY(petsitter_id) REFERENCES petsitter(id) ON DELETE CASCADE
);
CREATE TABLE review (
  review_id TEXT PRIMARY KEY,
  reviewer_id TEXT NOT NULL,
  reviewee_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(reviewer_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY(reviewee_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE chatroom (
  room_id TEXT PRIMARY KEY,
  participant1_id TEXT NOT NULL,
  participant2_id TEXT NOT NULL,
  last_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(participant1_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY(participant2_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE chatmessage (
  message_id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(room_id) REFERENCES chatroom(room_id) ON DELETE CASCADE,
  FOREIGN KEY(sender_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE notification (
  notification_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sender_id TEXT,
  room_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,    -- 'message', 'booking_request', or 'booking_response'
  count INTEGER DEFAULT 1,            -- For aggregating multiple notifications (for messages)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY(room_id) REFERENCES chatroom(room_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_unique_message_notification
ON notification(user_id, sender_id, room_id, notification_type);