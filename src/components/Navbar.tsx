import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Início", href: "/" },
  { label: "V-Bucks", href: "/vbucks" },
  { label: "Contas", href: "/contas" },
  { label: "Categorias", href: "/categorias" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="VBucks Barato" className="h-10 w-10" />
          <span className="font-display text-xl font-bold text-gradient-gold tracking-wide">
            VBUCKS BARATO
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg text-muted-foreground transition-colors hover:text-primary hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-gold text-[10px] font-bold text-primary-foreground">
              0
            </span>
          </button>
          <button className="hidden md:flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-gold">
            <User className="h-4 w-4" />
            Entrar
          </button>
          <button
            className="md:hidden p-2 text-muted-foreground"
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
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto flex flex-col gap-4 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
              <button className="flex items-center justify-center gap-2 rounded-lg bg-gradient-gold px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground">
                <User className="h-4 w-4" />
                Entrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
