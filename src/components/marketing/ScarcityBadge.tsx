import { Clock, Flame } from "lucide-react";

interface ScarcityBadgeProps {
  count: number;
  className?: string;
}

/** Shows "Últimas X unidades" when stock is low, or "Alta demanda" for popular items */
const ScarcityBadge = ({ count, className = "" }: ScarcityBadgeProps) => {
  if (count > 5) return null;

  if (count <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[9px] font-bold text-destructive uppercase tracking-wider ${className}`}>
        Esgotado
      </span>
    );
  }

  if (count <= 3) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider animate-pulse ${className}`}>
        <Flame className="h-2.5 w-2.5" />
        {count === 1 ? "Última unidade!" : `Últimas ${count} unidades`}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider ${className}`}>
      <Clock className="h-2.5 w-2.5" />
      Poucas unidades
    </span>
  );
};

export default ScarcityBadge;
