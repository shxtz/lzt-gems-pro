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

    const { maxAgeDays = 30 } = await req.json().catch(() => ({ maxAgeDays: 30 }));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    // Delete old unavailable accounts
    const { data: deleted, error } = await supabase
      .from("lzt_accounts")
      .delete()
      .eq("status", "unavailable")
      .lt("imported_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      console.error("Cleanup error:", error);
      return new Response(JSON.stringify({ error: "Cleanup failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also clean up sold accounts older than maxAgeDays
    const { data: soldDeleted } = await supabase
      .from("lzt_accounts")
      .delete()
      .eq("status", "sold")
      .lt("sold_at", cutoffDate.toISOString())
      .select("id");

    const totalDeleted = (deleted?.length || 0) + (soldDeleted?.length || 0);

    console.log(`LZT cleanup: removed ${totalDeleted} old accounts`);

    return new Response(
      JSON.stringify({ deleted: totalDeleted, cutoffDate: cutoffDate.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LZT cleanup error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
