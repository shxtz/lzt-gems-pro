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
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    const restoreCordApiKey = Deno.env.get("RESTORECORD_API_KEY");
    const restoreCordServerId = Deno.env.get("RESTORECORD_SERVER_ID");

    if (!restoreCordApiKey || !restoreCordServerId) {
      return new Response(JSON.stringify({ error: "RestoreCord config missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, email } = await req.json();

    const authHeader = req.headers.get("Authorization");
    const isServiceRequest = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isServiceRequest) {
      if (!authHeader || !publishableKey) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authClient = createClient(supabaseUrl, publishableKey, {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      });

      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user || user.id !== userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to find user in RestoreCord by email
    const response = await fetch(
      `https://restorecord.com/api/v2/servers/${restoreCordServerId}/members?search=${encodeURIComponent(email || "")}`,
      {
        headers: {
          Authorization: `Bearer ${restoreCordApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RestoreCord lookup error:", errorText);
      return new Response(JSON.stringify({ found: false, error: "Lookup failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const members = await response.json();

    if (members && members.length > 0) {
      const discordId = members[0].discord_id || members[0].id;
      const username = members[0].display_name || members[0].username || members[0].name || null;
      const avatar = members[0].avatar || members[0].avatar_url || null;

      const { data: existingDiscordOwner, error: existingDiscordOwnerError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("discord_id", discordId)
        .neq("user_id", userId)
        .maybeSingle();

      if (existingDiscordOwnerError) {
        return new Response(JSON.stringify({ error: existingDiscordOwnerError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (existingDiscordOwner) {
        return new Response(JSON.stringify({ found: false, error: "Este Discord já está vinculado a outra conta." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          discord_id: discordId,
          restorecord_verified: true,
          display_name: username,
          avatar_url: avatar,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ found: true, discordId, username, avatar }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Retry discord lookup error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
