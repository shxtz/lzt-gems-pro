import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const guildId = Deno.env.get("DISCORD_GUILD_ID");
    const customerRoleId = Deno.env.get("DISCORD_CUSTOMER_ROLE_ID");

    if (!botToken || !guildId) {
      return new Response(
        JSON.stringify({ error: "Discord not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, discord_id, user_id } = await req.json();

    // Check if a Discord user is in the guild (verified via RestoreCord)
    if (action === "check_member") {
      if (!discord_id) {
        return new Response(
          JSON.stringify({ error: "discord_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discord_id}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });

      if (!res.ok) {
        return new Response(
          JSON.stringify({ verified: false, reason: "Usuário não encontrado no servidor Discord. Verifique pelo RestoreCord primeiro." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const member = await res.json();
      const username = member.user?.username || "";
      const globalName = member.user?.global_name || username;
      const avatar = member.user?.avatar
        ? `https://cdn.discordapp.com/avatars/${discord_id}/${member.user.avatar}.png`
        : null;

      return new Response(
        JSON.stringify({
          verified: true,
          discord_id,
          username: globalName || username,
          avatar,
          roles: member.roles || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save Discord ID to user profile after signup
    if (action === "link_profile") {
      if (!discord_id || !user_id) {
        return new Response(
          JSON.stringify({ error: "discord_id and user_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      const { error } = await supabase
        .from("profiles")
        .update({
          discord_id,
          restorecord_verified: true,
        })
        .eq("user_id", user_id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
