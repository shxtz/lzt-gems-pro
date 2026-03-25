import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import AccountPreview from "./pages/AccountPreview";
import VBucksPage from "./pages/VBucksPage";
import CategoryPage from "./pages/CategoryPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import Checkout from "./pages/Checkout";
import ClientArea from "./pages/ClientArea";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductsNew from "./pages/admin/AdminProductsNew";
import Shop from "./pages/Shop";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLZT from "./pages/admin/AdminLZT";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBalance from "./pages/admin/AdminBalance";
import AdminDiscord from "./pages/admin/AdminDiscord";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/loja" element={<Shop />} />
              <Route path="/vbucks" element={<VBucksPage />} />
              <Route path="/contas/:slug" element={<CategoryPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/preview/:id" element={<AccountPreview />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route
                path="/minha-conta"
                element={
                  <ProtectedRoute>
                    <ClientArea />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="produtos" element={<AdminProductsNew />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="lzt" element={<AdminLZT />} />
                <Route path="tickets" element={<AdminTickets />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="balance" element={<AdminBalance />} />
                <Route path="discord" element={<AdminDiscord />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
