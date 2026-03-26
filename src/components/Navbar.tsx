import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ShoppingCart, User, Menu, X, LogOut, ChevronDown, Settings, ShoppingBag, Shield, Home, LayoutGrid, Store } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import vbucksNavIcon from "@/assets/vbucks-icon.png";

const navItems = [
  { label: "Início", href: "/", icon: "home" },
  { label: "V-Bucks", href: "/vbucks", icon: "vbucks" },
  { label: "Categorias", href: "/#categories", icon: "categories" },
  { label: "Loja", href: "/loja", icon: "store" },
] as const;

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { totalItems } = useCart();
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["navbar-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNav = (href: string) => {
    if (href.includes("#")) {
      const hash = href.split("#")[1];
      const basePath = href.split("#")[0] || "/";
      if (window.location.pathname !== basePath) {
        navigate(basePath);
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      } else {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(href);
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate("/");
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "";

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass border-b border-gold-subtle shadow-card"
          : "bg-background/80 backdrop-blur-md border-b border-border/20"
      }`}
    >
      <div className="container mx-auto flex h-18 items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/" className="group flex items-center gap-3">
          <motion.img
            src={logo}
            alt="VBucks Barato"
            className="h-10 w-10 sm:h-11 sm:w-11 drop-shadow-lg"
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
          />
          <span className="hidden sm:flex items-baseline gap-0.5">
            <span className="font-body text-[15px] font-bold text-foreground tracking-[0.08em]">VBUCKS</span>
            <span className="font-body text-[15px] font-medium text-primary tracking-[0.08em]">BARATO</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className="relative flex items-center gap-1.5 px-5 py-2 font-body text-[13px] font-medium uppercase tracking-[0.15em] text-foreground transition-all duration-300 hover:text-primary group"
            >
              {item.icon === "home" && <Home className="h-3.5 w-3.5" />}
              {item.icon === "vbucks" && <img src={vbucksNavIcon} alt="" className="h-4 w-4" />}
              {item.icon === "categories" && <LayoutGrid className="h-3.5 w-3.5" />}
              {item.icon === "store" && <Store className="h-3.5 w-3.5" />}
              {item.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-gold rounded-full transition-all duration-300 group-hover:w-3/4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/checkout")}
            className="relative p-2.5 rounded-xl text-muted-foreground transition-all duration-300 hover:text-primary glass-gold"
          >
            <ShoppingCart className="h-[18px] w-[18px]" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gradient-gold text-[9px] font-bold text-primary-foreground shadow-gold animate-pulse">
                {totalItems}
              </span>
            )}
          </motion.button>

          {user ? (
            <div className="hidden lg:block relative" ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2.5 rounded-xl glass-gold px-3 py-2 transition-all duration-300 hover:shadow-gold border border-border/20"
              >
                <div className="h-8 w-8 rounded-lg overflow-hidden border border-border/30 bg-card shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
                <span className="font-body text-[12px] font-medium text-foreground max-w-[100px] truncate">
                  {displayName}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-xl bg-card/95 backdrop-blur-xl border border-border/40 shadow-card-hover overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border/20">
                      <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="p-1.5">
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/minha-conta?tab=profile"); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/minha-conta?tab=orders"); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                        Meus Pedidos
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate("/minha-conta?tab=security"); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                        Configurações
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="border-t border-border/20 p-1.5">
                        <button
                          onClick={() => { setDropdownOpen(false); navigate("/admin"); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          Painel Admin
                        </button>
                      </div>
                    )}
                    <div className="border-t border-border/20 p-1.5">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sair
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button
              onClick={() => navigate("/auth")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="hidden lg:flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all duration-300 hover:shadow-gold-intense"
            >
              <User className="h-3.5 w-3.5" />
              Entrar
            </motion.button>
          )}

          <button
            className="lg:hidden p-2.5 rounded-xl text-muted-foreground glass-gold"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden glass border-t border-gold-subtle overflow-hidden"
          >
            <div className="container mx-auto flex flex-col gap-1 p-4">
              {user && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-muted/30 border border-border/20"
                >
                  <div className="h-10 w-10 rounded-lg overflow-hidden border border-border/30 bg-card shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </motion.div>
              )}

              {navItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <button
                    onClick={() => { setMobileOpen(false); handleNav(item.href); }}
                    className="flex items-center gap-2 w-full text-left py-3 px-4 rounded-lg font-body text-[13px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
                  >
                    {item.icon === "home" && <Home className="h-4 w-4" />}
                    {item.icon === "vbucks" && <img src={vbucksNavIcon} alt="" className="h-4.5 w-4.5" />}
                    {item.icon === "categories" && <LayoutGrid className="h-4 w-4" />}
                    {item.icon === "store" && <Store className="h-4 w-4" />}
                    {item.label}
                  </button>
                </motion.div>
              ))}

              {user ? (
                <>
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={() => { navigate("/minha-conta"); setMobileOpen(false); }}
                    className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground"
                  >
                    <User className="h-3.5 w-3.5" />
                    Minha Conta
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 px-5 py-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair
                  </motion.button>
                </>
              ) : (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={() => { navigate("/auth"); setMobileOpen(false); }}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground"
                >
                  <User className="h-3.5 w-3.5" />
                  Entrar
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
