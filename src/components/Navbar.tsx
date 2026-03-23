import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Início", href: "/" },
  { label: "V-Bucks", href: "/vbucks" },
  { label: "Contas", href: "/contas" },
  { label: "Categorias", href: "/categorias" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass border-b border-gold-subtle shadow-card"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex h-18 items-center justify-between px-6 py-3">
        <Link to="/" className="group flex items-center gap-3">
          <motion.img
            src={logo}
            alt="VBucks Barato"
            className="h-11 w-11 drop-shadow-lg"
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
            <Link
              key={item.href}
              to={item.href}
              className="relative px-5 py-2 font-body text-[13px] font-medium uppercase tracking-[0.15em] text-foreground transition-all duration-300 hover:text-primary group"
            >
              {item.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-gold rounded-full transition-all duration-300 group-hover:w-3/4" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2.5 rounded-xl text-muted-foreground transition-all duration-300 hover:text-primary glass-gold"
          >
            <ShoppingCart className="h-[18px] w-[18px]" />
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gradient-gold text-[9px] font-bold text-primary-foreground shadow-gold animate-pulse">
              0
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden lg:flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all duration-300 hover:shadow-gold-intense"
          >
            <User className="h-3.5 w-3.5" />
            Entrar
          </motion.button>

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
            <div className="container mx-auto flex flex-col gap-1 p-5">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-3 px-4 rounded-lg font-body text-[13px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground"
              >
                <User className="h-3.5 w-3.5" />
                Entrar
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
