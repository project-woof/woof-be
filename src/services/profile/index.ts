/// <reference types="@cloudflare/workers-types" />

export interface Env {
  PETSITTER_DB: D1Database;
  PETSITTER_STORAGE: R2Bucket;
}

interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  userType: 'petowner' | 'both';
  created_at: string;
  updated_at: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      const healthData = {
        status: "ok",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(healthData), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });
    }

    // Check if user exists
    if (url.pathname === "/check") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { 
          status: 405,
          headers: corsHeaders
        });
      }

      try {
        const { email } = await request.json() as { email: string };
        
        if (!email) {
          return new Response(JSON.stringify({ error: "Email is required" }), {
            status: 400,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          });
        }

        // Check if user exists in database
        const user = await env.PETSITTER_DB.prepare(
          "SELECT * FROM users WHERE email = ?"
        )
          .bind(email)
          .first();

        return new Response(
          JSON.stringify({
            exists: !!user,
            userType: user ? user.userType : null,
          }),
          {
            status: 200,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to check user" }),
          {
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          }
        );
      }
    }

    // Create user profile
    if (url.pathname === "/create") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { 
          status: 405,
          headers: corsHeaders
        });
      }

      try {
        const { email, name, picture, userType } = await request.json() as {
          email: string;
          name: string;
          picture?: string;
          userType: 'petowner' | 'both';
        };

        if (!email || !name || !userType) {
          return new Response(
            JSON.stringify({ error: "Email, name, and userType are required" }),
            {
              status: 400,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              },
            }
          );
        }

        // Check if user already exists
        const existingUser = await env.PETSITTER_DB.prepare(
          "SELECT * FROM users WHERE email = ?"
        )
          .bind(email)
          .first();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: "User already exists" }),
            {
              status: 409,
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              },
            }
          );
        }

        const now = new Date().toISOString();
        const newUser: UserProfile = {
          email,
          name,
          picture,
          userType,
          created_at: now,
          updated_at: now,
        };

        // Create user in database
        await env.PETSITTER_DB.prepare(
          `INSERT INTO users (email, name, picture, userType, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newUser.email,
            newUser.name,
            newUser.picture || null,
            newUser.userType,
            newUser.created_at,
            newUser.updated_at
          )
          .run();

        return new Response(
          JSON.stringify({
            message: "User created successfully",
            user: {
              email: newUser.email,
              name: newUser.name,
              userType: newUser.userType,
            },
          }),
          {
            status: 201,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          {
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            },
          }
        );
      }
    }

    return new Response("Profile Service: Route not found", { 
      status: 404,
      headers: corsHeaders
    });
  },
};
