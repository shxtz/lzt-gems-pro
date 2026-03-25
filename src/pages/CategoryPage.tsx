import { useParams, Navigate } from "react-router-dom";
import Shop from "./Shop";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <Navigate to="/loja" replace />;
  }

  return <Shop initialCategorySlug={slug} />;
};

export default CategoryPage;
