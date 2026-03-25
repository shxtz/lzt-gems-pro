import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: user } = await supabase.auth.getUser(token);
    if (!user.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles without discord_id
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email")
      .is("discord_id", null)
      .limit(50);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "No profiles without discord_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restoreCordApiKey = Deno.env.get("RESTORECORD_API_KEY");
    const restoreCordServerId = Deno.env.get("RESTORECORD_SERVER_ID");
    let synced = 0;

    if (restoreCordApiKey && restoreCordServerId) {
      for (const profile of profiles) {
        try {
          const res = await fetch(
            `${supabaseUrl}/functions/v1/retry-discord-lookup`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({ userId: profile.user_id, email: profile.email }),
            }
          );
          const result = await res.json();
          if (result.found) synced++;
        } catch (_) { /* continue */ }
      }
    }

    return new Response(JSON.stringify({ synced, total: profiles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sync discord ids error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
