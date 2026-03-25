import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAdmin(supabase: any, authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.replace("Bearer ", "");
  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) throw new Error("Unauthorized");
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.user.id)
    .eq("role", "admin")
    .single();
  if (!roleData) throw new Error("Forbidden");
  return user.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await verifyAdmin(supabase, req.headers.get("Authorization"));

    const { action, userId, data } = await req.json();

    switch (action) {
      case "list-users": {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*, user_roles(role)")
          .order("created_at", { ascending: false })
          .limit(data?.limit || 50);
        if (error) throw error;
        return new Response(JSON.stringify({ users: profiles }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-user": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*, user_roles(role)")
          .eq("user_id", userId)
          .single();
        const { data: orders } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        return new Response(JSON.stringify({ profile, orders }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update-balance": {
        const { amount, reason } = data;
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("user_id", userId)
          .single();

        const currentBalance = Number(profile?.balance || 0);
        const newBalance = currentBalance + Number(amount);

        await supabase
          .from("profiles")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        return new Response(JSON.stringify({ success: true, newBalance }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "ban-user": {
        await supabase.auth.admin.updateUserById(userId, { banned_until: "2099-12-31T23:59:59Z" });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "unban-user": {
        await supabase.auth.admin.updateUserById(userId, { banned_until: null });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
