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

    const restoreCordApiKey = Deno.env.get("RESTORECORD_API_KEY");
    const restoreCordServerId = Deno.env.get("RESTORECORD_SERVER_ID");

    if (!restoreCordApiKey || !restoreCordServerId) {
      return new Response(JSON.stringify({ error: "RestoreCord config missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, email } = await req.json();

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

      // Update profile with discord_id
      await supabase
        .from("profiles")
        .update({
          discord_id: discordId,
          restorecord_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ found: true, discordId }), {
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
