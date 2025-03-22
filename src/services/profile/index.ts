/// <reference types="@cloudflare/workers-types" />

// Define interfaces for our data models based on the DB schema
interface UserProfile {
  user_id?: string;
  username: string;
  email: string;
  profile_image_url?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  is_petsitter?: number; // 0: false, 1: true
  created_at?: string;
  last_updated?: string;
}

export interface Env {
  // Bindings from wrangler.jsonc
  PETSITTER_DB: D1Database;
  PETSITTER_STORAGE: R2Bucket;
}

// Define CORS headers as a constant to use consistently across all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return handleCors();
    }

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
        headers: corsHeaders,
      });
    }

    // Add check endpoint for backward compatibility with signup flow
    if (path === "/check") {
      return handleCheckProfile(request, env);
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

    return new Response("Profile Service: Route not found", { 
      status: 404,
      headers: corsHeaders
    });
  },
};

// CORS handler for preflight requests
function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Add check endpoint handler for backward compatibility with signup flow
async function handleCheckProfile(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const data = await request.json() as { email: string };
    
    if (!data.email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Check if user exists in database
    const user = await env.PETSITTER_DB.prepare(
      "SELECT * FROM user WHERE email = ?"
    )
      .bind(data.email)
      .first();

    return new Response(
      JSON.stringify({
        exists: !!user,
        // Map is_petsitter to userType for backward compatibility
        userType: user ? (user.is_petsitter === 1 ? 'both' : 'petowner') : null,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to check user" }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

async function handleCreateProfile(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Check if the request method is POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Parse the request body with type assertion
    const data = (await request.json()) as unknown;

    // Validate that data is an object
    if (typeof data !== "object" || data === null) {
      return new Response(JSON.stringify({ error: "Invalid data format" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Handle both new format and old format requests
    let profileData: Partial<UserProfile>;
    
    // Check if this is using the old format (from signup flow)
    if ('userType' in data && 'name' in data && 'email' in data) {
      const oldData = data as { email: string; name: string; picture?: string; userType: 'petowner' | 'both' };
      
      // Check if user already exists
      const existingUser = await env.PETSITTER_DB.prepare(
        "SELECT * FROM user WHERE email = ?"
      )
        .bind(oldData.email)
        .first();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: "User already exists" }),
          {
            status: 409,
            headers: corsHeaders,
          }
        );
      }
      
      // Convert old format to new format
      profileData = {
        username: oldData.name,
        email: oldData.email,
        profile_image_url: oldData.picture,
        is_petsitter: oldData.userType === 'both' ? 1 : 0
      };
    } else {
      // New format
      profileData = data as Partial<UserProfile>;
      
      // Check if user already exists
      if (profileData.email) {
        const existingUser = await env.PETSITTER_DB.prepare(
          "SELECT * FROM user WHERE email = ?"
        )
          .bind(profileData.email)
          .first();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "User already exists" }),
            {
              status: 409,
              headers: corsHeaders,
            }
          );
        }
      }
    }

    // Validate required fields
    if (!profileData.username || !profileData.email) {
      return new Response(
        JSON.stringify({ error: "Username and email are required" }),
        {
          status: 400,
          headers: corsHeaders,
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

    // For backward compatibility with signup flow
    const responseData = {
      message: "Profile created successfully",
      user_id: userId,
      user: {
        ...newUser,
        // Include userType for backward compatibility
        userType: newUser.is_petsitter === 1 ? 'both' : 'petowner'
      }
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 201,
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve profile",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: corsHeaders,
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
        headers: corsHeaders,
      });
    }

    // Get user_id from URL parameters instead of request body
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required in query parameters" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const data = (await request.json()) as unknown;

    // Validate that data is an object
    if (typeof data !== "object" || data === null) {
      return new Response(JSON.stringify({ error: "Invalid data format" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Handle both new format and old format requests
    let profileData: Partial<UserProfile>;
    
    // Check if this is using the old format (from signup flow)
    if ('userType' in data) {
      const oldData = data as { userType: 'petowner' | 'both' };
      
      // Convert old format to new format
      profileData = {
        is_petsitter: oldData.userType === 'both' ? 1 : 0
      };
    } else {
      // New format
      profileData = data as Partial<UserProfile>;
    }

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
          headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
      });
    }
    
    const url = new URL(request.url);
    const userId = url.searchParams.get("id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
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
        headers: corsHeaders,
      }
    );
  }
}
