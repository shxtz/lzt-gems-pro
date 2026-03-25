const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InventoryResponse {
  game: string;
  items: Array<{ name: string; rarity?: string; type: string; image?: string }>;
  stats: Record<string, string | number>;
}

function parseValorantInventory(data: any): InventoryResponse {
  return {
    game: "Valorant",
    items: data?.skins?.map((s: any) => ({
      name: s.name || s.displayName,
      rarity: s.rarity || "Standard",
      type: "skin",
      image: s.displayIcon || s.image,
    })) || [],
    stats: {
      rank: data?.rank || "Unranked",
      level: data?.level || 0,
      agents: data?.agents?.length || 0,
      skins: data?.skins?.length || 0,
      region: data?.region || "N/A",
    },
  };
}

function parseFortniteInventory(data: any): InventoryResponse {
  return {
    game: "Fortnite",
    items: data?.cosmetics?.map((c: any) => ({
      name: c.name,
      rarity: c.rarity,
      type: c.type || "outfit",
      image: c.image,
    })) || [],
    stats: {
      vbucks: data?.vbucks || 0,
      skins: data?.cosmetics?.filter((c: any) => c.type === "outfit")?.length || 0,
      pickaxes: data?.cosmetics?.filter((c: any) => c.type === "pickaxe")?.length || 0,
      gliders: data?.cosmetics?.filter((c: any) => c.type === "glider")?.length || 0,
      level: data?.level || 0,
    },
  };
}

function parseGenshinInventory(data: any): InventoryResponse {
  return {
    game: "Genshin Impact",
    items: data?.characters?.map((c: any) => ({
      name: c.name,
      rarity: `${c.rarity || 4}★`,
      type: "character",
      image: c.image,
    })) || [],
    stats: {
      ar: data?.ar || data?.adventure_rank || 0,
      characters_5star: data?.characters?.filter((c: any) => c.rarity === 5)?.length || 0,
      weapons_5star: data?.weapons?.filter((w: any) => w.rarity === 5)?.length || 0,
      region: data?.region || "N/A",
    },
  };
}

function parseLolInventory(data: any): InventoryResponse {
  return {
    game: "League of Legends",
    items: data?.skins?.map((s: any) => ({
      name: s.name,
      rarity: s.rarity || "Standard",
      type: "skin",
      image: s.image,
    })) || [],
    stats: {
      level: data?.level || 0,
      champions: data?.champions?.length || 0,
      skins: data?.skins?.length || 0,
      rank: data?.rank || "Unranked",
      blue_essence: data?.blue_essence || 0,
      rp: data?.rp || 0,
    },
  };
}

function parseGenericInventory(data: any, game: string): InventoryResponse {
  return {
    game,
    items: data?.items?.map((i: any) => ({
      name: i.name || "Item",
      rarity: i.rarity,
      type: i.type || "item",
      image: i.image,
    })) || [],
    stats: data?.stats || {},
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { game, data } = await req.json();

    if (!game || !data) {
      return new Response(JSON.stringify({ error: "game and data are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let inventory: InventoryResponse;

    switch (game.toLowerCase()) {
      case "valorant":
        inventory = parseValorantInventory(data);
        break;
      case "fortnite":
        inventory = parseFortniteInventory(data);
        break;
      case "genshin":
      case "genshin impact":
        inventory = parseGenshinInventory(data);
        break;
      case "lol":
      case "league of legends":
        inventory = parseLolInventory(data);
        break;
      default:
        inventory = parseGenericInventory(data, game);
    }

    return new Response(JSON.stringify(inventory), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Game inventory error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
