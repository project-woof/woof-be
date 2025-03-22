/// <reference types="@cloudflare/workers-types" />

// Define interfaces for our data models based on your actual DB schema
interface UserProfile {
  username: string;
  email: string;
  profile_image_url?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  is_petsitter?: number; // 0: false, 1: true
}

export interface Env {
  // Bindings from wrangler.jsonc
  PETSITTER_DB: D1Database;
  PETSITTER_STORAGE: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check endpoint
    if (path === "/health") {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(healthData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Profile endpoints
    if (path === "/create") {
      return handleCreateProfile(request, env);
    }

    if (path === "/get") {
      return handleGetProfile(request, env);
    }

    if (path === "/update") {
      return handleUpdateProfile(request, env);
    }

    if (path === "/delete") {
      return handleDeleteProfile(request, env);
    }

    return new Response("Profile Service: Route not found", { status: 404 });
  },
};

async function handleCreateProfile(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Check if the request method is POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the request body with type assertion
    const data = (await request.json()) as unknown;

    // Validate that data is an object
    if (typeof data !== "object" || data === null) {
      return new Response(JSON.stringify({ error: "Invalid data format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    const profileData = data as Partial<UserProfile>;
    if (!profileData.username || !profileData.email) {
      return new Response(
        JSON.stringify({ error: "Username and email are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a new profile (user_id will be auto-generated by the DB)
    const newUser: UserProfile = {
      username: profileData.username,
      email: profileData.email,
      profile_image_url: profileData.profile_image_url,
      latitude: profileData.latitude,
      longitude: profileData.longitude,
      description: profileData.description,
      is_petsitter: profileData.is_petsitter || 0,
    };

    // Insert the user and let the database generate the user_id
    const result = await env.PETSITTER_DB.prepare(
      `INSERT INTO user ( username, email, profile_image_url, 
        latitude, longitude, description, is_petsitter
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        newUser.username,
        newUser.email,
        newUser.profile_image_url || null,
        newUser.latitude || null,
        newUser.longitude || null,
        newUser.description || null,
        newUser.is_petsitter
      )
      .run();

    // Get the auto-generated user_id
    let userId = null;
    if (result.meta?.last_row_id) {
      // Query to get the inserted user with the auto-generated ID
      const insertedUser = await env.PETSITTER_DB.prepare(
        `SELECT user_id FROM user WHERE rowid = ?`
      )
        .bind(result.meta.last_row_id)
        .first();
      
      if (insertedUser) {
        userId = insertedUser.user_id;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Profile created successfully",
        user_id: userId,
        user: newUser,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to create profile",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleGetProfile(request: Request, env: Env): Promise<Response> {
  try {
    // Get profile ID from URL parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Query the database for the user
    const user = await env.PETSITTER_DB.prepare(
      `SELECT user_id, username, email, profile_image_url, 
              latitude, longitude, description, is_petsitter,
              created_at, last_updated
       FROM user 
       WHERE user_id = ?`
    )
      .bind(userId)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve profile",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleUpdateProfile(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (request.method !== "PUT" && request.method !== "PATCH") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get user_id from URL parameters instead of request body
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required in query parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = (await request.json()) as unknown;

    // Validate that data is an object
    if (typeof data !== "object" || data === null) {
      return new Response(JSON.stringify({ error: "Invalid data format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cast to our interface
    const profileData = data as Partial<UserProfile>;

    // Build dynamic update SQL based on provided fields
    const fieldUpdates = [];
    const values = [];

    // Check each field and add it to the update if present
    if (profileData.username !== undefined) {
      fieldUpdates.push("username = ?");
      values.push(profileData.username);
    }

    if (profileData.email !== undefined) {
      fieldUpdates.push("email = ?");
      values.push(profileData.email);
    }

    if (profileData.profile_image_url !== undefined) {
      fieldUpdates.push("profile_image_url = ?");
      values.push(profileData.profile_image_url);
    }

    if (profileData.latitude !== undefined) {
      fieldUpdates.push("latitude = ?");
      values.push(profileData.latitude);
    }

    if (profileData.longitude !== undefined) {
      fieldUpdates.push("longitude = ?");
      values.push(profileData.longitude);
    }

    if (profileData.description !== undefined) {
      fieldUpdates.push("description = ?");
      values.push(profileData.description);
    }

    if (profileData.is_petsitter !== undefined) {
      fieldUpdates.push("is_petsitter = ?");
      values.push(profileData.is_petsitter);
    }

    // Add last_updated timestamp
    fieldUpdates.push("last_updated = CURRENT_TIMESTAMP");

    // Add the user_id at the end for the WHERE clause
    values.push(userId);

    if (fieldUpdates.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No fields to update",
          user_id: userId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Construct and execute the update query
    const updateSQL = `UPDATE user SET ${fieldUpdates.join(", ")} WHERE user_id = ?`;
    const result = await env.PETSITTER_DB.prepare(updateSQL)
      .bind(...values)
      .run();

    // D1 uses meta.changes to track affected rows
    if (!result.meta || result.meta.affected_rows === 0) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Profile updated successfully",
        user_id: userId,
        affected_rows: result.meta?.affected_rows,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to update profile",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleDeleteProfile(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (request.method !== "DELETE") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // First check if the user exists before trying to delete
    const userCheck = await env.PETSITTER_DB.prepare(
      "SELECT user_id FROM user WHERE user_id = ?"
    )
      .bind(userId)
      .first();
    
    if (!userCheck) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // With CASCADE constraints, you only need to delete the user
    const result = await env.PETSITTER_DB.prepare(
      "DELETE FROM user WHERE user_id = ?"
    )
      .bind(userId)
      .run();
    
    // The user was already confirmed to exist, so this is just a double-check
    if (!result.meta || result.meta.affected_rows === 0) {
      return new Response(JSON.stringify({ error: "Failed to delete user" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(
      JSON.stringify({
        message: "Profile deleted successfully",
        user_id: userId,
        affected_rows: result.meta?.affected_rows,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to delete profile",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}