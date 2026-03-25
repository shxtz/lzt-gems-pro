const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("image_url");

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "image/*,*/*",
    };

    if (imageUrl.includes("api.lzt.market") || imageUrl.includes("prod-api.lzt.market")) {
      const lztApiKey = Deno.env.get("LZT_API_KEY");
      if (lztApiKey) headers["Authorization"] = `Bearer ${lztApiKey}`;
    }

    const response = await fetch(imageUrl, { headers });

    if (!response.ok) {
      if (response.status === 401 && imageUrl.includes("/image/show?jwt=")) {
        const match = imageUrl.match(/(?:prod-api|api)\.lzt\.market\/(\d+)\/image\/show\?jwt=.*$/);
        if (match) {
          const itemId = match[1];
          let imageType = "weapons";
          try {
            const jwtParts = imageUrl.split("jwt=")[1]?.split(".");
            if (jwtParts && jwtParts[1]) {
              const payload = JSON.parse(atob(jwtParts[1].replace(/-/g, "+").replace(/_/g, "/")));
              const jti = payload.jti || "";
              imageType = jti.split(":")[1] || "weapons";
            }
          } catch {}

          const fallbackUrl = `https://prod-api.lzt.market/${itemId}/image?type=${imageType}`;
          const lztApiKey = Deno.env.get("LZT_API_KEY");
          if (lztApiKey) {
            const fallbackRes = await fetch(fallbackUrl, {
              headers: { Authorization: `Bearer ${lztApiKey}`, Accept: "application/json" },
            });
            if (fallbackRes.ok) {
              return await handleLztResponse(fallbackRes);
            }
          }
        }
      }

      return new Response(JSON.stringify({ error: `Failed to fetch image: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await handleLztResponse(response);
  } catch (err) {
    console.error("LZT Proxy error:", err);
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleLztResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") || "";

  // If response is JSON, it contains base64 image data
  if (contentType.includes("application/json")) {
    try {
      const json = await response.json();
      if (json.base64) {
        const binaryStr = atob(json.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return new Response(bytes, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    } catch {}
    return new Response(JSON.stringify({ error: "Invalid image response" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If response is already an image, pass through
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": contentType || "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
