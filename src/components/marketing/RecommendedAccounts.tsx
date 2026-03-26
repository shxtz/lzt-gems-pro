import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/supabase-resilience";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecommendedAccountsProps {
  currentAccountId: string;
  categoryId: string;
  categoryName: string;
  maxItems?: number;
}

const RecommendedAccounts = ({ currentAccountId, categoryId, categoryName, maxItems = 4 }: RecommendedAccountsProps) => {
  const navigate = useNavigate();

  const { data: recommendations } = useQuery({
    queryKey: ["recommended-accounts", categoryId, currentAccountId],
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("lzt_accounts")
            .select("id, lzt_item_id, price_brl, category_id, data")
            .eq("status", "available")
            .eq("category_id", categoryId)
            .neq("id", currentAccountId)
            .order("imported_at", { ascending: false })
            .limit(maxItems),
        );
        if (error) throw error;
        return data;
      } catch {
        return [];
      }
    },
    enabled: !!categoryId && !!currentAccountId,
  });

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-10"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-bold text-foreground">Contas Similares</h3>
        </div>
        <button
          onClick={() => navigate("/loja")}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          Ver todas <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {recommendations.map((acc) => {
          const d = acc.data as any;
          const prefix = (() => {
            const n = categoryName.toLowerCase();
            const map: Record<string, string> = { valorant: "VAL", fortnite: "FN", lol: "LOL", genshin: "GI", honkai: "HSR", minecraft: "MINE", steam: "STM", zzz: "ZZZ" };
            for (const [k, p] of Object.entries(map)) { if (n.includes(k)) return p; }
            return "ACC";
          })();
          const hash = Math.abs([...acc.lzt_item_id].reduce((a: number, c: string) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0));
          const name = `${prefix}-VB#${String(hash).slice(-5).padStart(5, "0")}`;

          return (
            <motion.div
              key={acc.id}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/preview/${acc.id}`)}
              className="cursor-pointer rounded-xl border border-border/30 bg-card p-3 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <Badge className="bg-primary/10 text-primary text-[9px] border-0 mb-2">{categoryName}</Badge>
              <p className="font-display text-xs font-semibold text-foreground truncate">{name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-primary">R$ {Number(acc.price_brl).toFixed(2)}</span>
                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecommendedAccounts;
