import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (context: string, data: Record<string, unknown>) =>
  console.log(`[secure-checkout] ${context}`, JSON.stringify(data));

const logError = (context: string, data: Record<string, unknown>) =>
  console.error(`[secure-checkout] ${context}`, JSON.stringify(data));

/**
 * Idempotency window: prevent duplicate orders from double-clicks.
 * Checks if an order with the same user+product+variation was created in the last 30s.
 */
async function checkIdempotency(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  productId: string,
  variationId: string | null,
  lztAccountId: string | null,
) {
  const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();

  let query = supabase
    .from("orders")
    .select("id, status")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .gte("created_at", thirtySecondsAgo)
    .in("status", ["pending", "paid", "delivered"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (variationId) {
    query = query.eq("variation_id", variationId);
  }
  if (lztAccountId) {
    query = query.eq("lzt_account_id", lztAccountId);
  }

  const { data } = await query;
  return data?.[0] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── 1. Auth ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    log("auth", { userId: user.id });

    // ── 2. Input ─────────────────────────────────────────
    const body = await req.json();
    const {
      product_id,
      variation_index,
      quantity = 1,
      coupon_code,
      lzt_account_id,
      lzt_item_id,
      fortnite_username,
    } = body;

    if (!product_id) {
      return json({ error: "product_id é obrigatório" }, 400);
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return json({ error: "Quantidade inválida" }, 400);
    }

    // ── 3. Resolve product/price ─────────────────────────
    let unitPrice: number;
    let variationId: string | null = null;
    let lztAccountId: string | null = null;

    if (lzt_account_id || lzt_item_id) {
      // ── LZT flow ────────────────────────────────────
      const lztQuery = lzt_account_id
        ? supabase.from("lzt_accounts").select("id, price_brl, status").eq("id", lzt_account_id).eq("status", "available").single()
        : supabase.from("lzt_accounts").select("id, price_brl, status").eq("lzt_item_id", lzt_item_id!).eq("status", "available").single();

      const { data: lztAccount, error: lztError } = await lztQuery;

      if (lztError || !lztAccount) {
        log("lzt_not_found", { lzt_account_id, lzt_item_id });
        return json({ error: "Conta LZT não encontrada ou indisponível" }, 404);
      }

      unitPrice = Number(lztAccount.price_brl);
      lztAccountId = lztAccount.id;

      // Atomic reserve: update only if still available
      const { data: reserved, error: reserveError } = await supabase
        .from("lzt_accounts")
        .update({ status: "reserved", buyer_id: user.id })
        .eq("id", lztAccount.id)
        .eq("status", "available")
        .select("id");

      if (reserveError || !reserved || reserved.length !== 1) {
        logError("lzt_reserve_race", { lztAccountId: lztAccount.id, reserveError });
        return json({ error: "Conta já reservada por outro comprador" }, 409);
      }

      log("lzt_reserved", { lztAccountId: lztAccount.id, price_brl: unitPrice });
    } else {
      // ── Standard product flow ──────────────────────
      const { data: product, error: prodError } = await supabase
        .from("products")
        .select("id, active, name")
        .eq("id", product_id)
        .eq("active", true)
        .single();

      if (prodError || !product) {
        return json({ error: "Produto não encontrado" }, 404);
      }

      const { data: variations, error: varError } = await supabase
        .from("product_variations")
        .select("id, price, active, name")
        .eq("product_id", product_id)
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (varError || !variations?.length) {
        return json({ error: "Nenhuma variação disponível" }, 404);
      }

      const idx = typeof variation_index === "number" ? variation_index : 0;
      if (idx < 0 || idx >= variations.length) {
        return json({ error: "Variação inválida" }, 400);
      }

      const variation = variations[idx];
      unitPrice = Number(variation.price);
      variationId = variation.id;

      const { count: stockCount } = await supabase
        .from("product_stock")
        .select("id", { count: "exact", head: true })
        .eq("variation_id", variation.id)
        .eq("status", "available");

      if ((stockCount ?? 0) < quantity) {
        return json({ error: "Estoque insuficiente" }, 409);
      }
    }

    // ── 4. Idempotency check ─────────────────────────────
    const existingOrder = await checkIdempotency(
      supabase, user.id, product_id, variationId, lztAccountId,
    );

    if (existingOrder) {
      log("idempotency_hit", { existingOrderId: existingOrder.id, status: existingOrder.status });
      return json({
        orderId: existingOrder.id,
        requiresPix: existingOrder.status === "pending",
        status: existingOrder.status,
        deduplicated: true,
      });
    }

    // ── 5. Coupon ────────────────────────────────────────
    let discountPercent = 0;
    let couponId: string | null = null;

    if (coupon_code) {
      const { data: couponRows } = await supabase.rpc("validate_coupon", {
        coupon_code: coupon_code.trim(),
      });
      const coupon = Array.isArray(couponRows) ? couponRows[0] : couponRows;
      if (coupon) {
        discountPercent = coupon.discount_percent;
        couponId = coupon.id;
        log("coupon_applied", { couponId, discountPercent });
      }
    }

    // ── 6. Calculate price ───────────────────────────────
    const subtotal = unitPrice * quantity;
    const discountAmount = subtotal * (discountPercent / 100);
    const totalPrice = Math.round(Math.max(subtotal - discountAmount, 0) * 100) / 100;

    if (totalPrice <= 0) {
      return json({ error: "Valor total inválido" }, 400);
    }

    log("price_calculated", { unitPrice, quantity, discountPercent, totalPrice });

    // ── 7. Check balance ─────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const userBalance = Number(profile?.balance ?? 0);
    const canPayWithBalance = userBalance >= totalPrice;

    // ── 8. CREATE ORDER FIRST (always pending) ───────────
    const orderData: Record<string, unknown> = {
      user_id: user.id,
      product_id,
      variation_id: variationId,
      quantity,
      total_price: totalPrice,
      coupon_id: couponId,
      status: "pending",
      payment_method: canPayWithBalance ? "balance" : "pix",
      lzt_account_id: lztAccountId,
      lzt_item_id: lzt_item_id || null,
      fortnite_username: fortnite_username || null,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select("id")
      .single();

    if (orderError || !order) {
      logError("order_creation_failed", { orderError, lztAccountId });
      // Rollback LZT reservation
      if (lztAccountId) {
        await supabase
          .from("lzt_accounts")
          .update({ status: "available", buyer_id: null })
          .eq("id", lztAccountId);
        log("lzt_rollback", { lztAccountId });
      }
      return json({ error: "Erro ao criar pedido" }, 500);
    }

    log("order_created", { orderId: order.id, totalPrice, paymentMethod: canPayWithBalance ? "balance" : "pix" });

    // ── 9. If balance is enough, debit WITH orderId ──────
    if (canPayWithBalance) {
      const { data: debited } = await supabase.rpc("debit_balance", {
        _user_id: user.id,
        _amount: totalPrice,
        _order_id: order.id,
        _description: `Compra do produto ${product_id}`,
      });

      if (debited !== true) {
        // Debit failed — order stays pending, user must pay via PIX
        logError("debit_failed", { orderId: order.id, balance: userBalance, totalPrice });

        // Update payment_method to pix since balance failed
        await supabase
          .from("orders")
          .update({ payment_method: "pix" })
          .eq("id", order.id)
          .eq("status", "pending");

        return json({
          orderId: order.id,
          requiresPix: true,
          status: "pending",
        });
      }

      log("balance_debited", { orderId: order.id, amount: totalPrice });

      // Mark order as paid
      const { error: paidError } = await supabase
        .from("orders")
        .update({ status: "paid", payment_method: "balance" })
        .eq("id", order.id)
        .eq("status", "pending");

      if (paidError) {
        logError("order_paid_update_failed", { orderId: order.id, paidError });
        // Balance was debited but order update failed — needs manual review
        // Don't return error to user, order exists and balance was debited
      }

      log("order_paid", { orderId: order.id });

      // Trigger delivery in background
      supabase.functions
        .invoke("deliver-product", { body: { orderId: order.id } })
        .then(() => log("delivery_triggered", { orderId: order.id }))
        .catch((err: Error) => logError("delivery_trigger_failed", { orderId: order.id, error: err.message }));

      return json({
        orderId: order.id,
        requiresPix: false,
        delivered: false,
        status: "paid",
      });
    }

    // ── 10. Requires PIX ─────────────────────────────────
    return json({
      orderId: order.id,
      requiresPix: true,
      status: "pending",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    logError("unhandled", { error: message });
    return json({ error: "Erro ao processar checkout" }, 500);
  }
});
