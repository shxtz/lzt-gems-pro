import { useParams, Navigate } from "react-router-dom";
import Shop from "./Shop";

const SLUG_MAP: Record<string, string> = {
  valorant: "VALORANT",
  fortnite: "FORTNITE",
  genshin: "GENSHIN IMPACT",
  lol: "LEAGUE OF LEGENDS",
  honkai: "HONKAI: STAR RAIL",
  minecraft: "MINECRAFT",
  steam: "STEAM",
  zzz: "ZENLESS ZONE ZERO",
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug || !SLUG_MAP[slug]) {
    return <Navigate to="/loja" replace />;
  }

  return <Shop initialCategorySlug={slug} />;
};

export default CategoryPage;
