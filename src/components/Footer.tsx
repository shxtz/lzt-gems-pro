import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const footerLinks = [
  { label: "Termos de Uso", href: "/termos" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Contato", href: "/contato" },
];

const Footer = () => {
  return (
    <footer className="relative overflow-hidden py-16">
      {/* Top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(43 84% 55% / 0.03), transparent 60%)" }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center gap-8">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3"
          >
            <img src={logo} alt="VBucks Barato" className="h-10 w-10 drop-shadow-lg" />
            <span className="font-display text-sm font-bold text-gradient-gold tracking-[0.2em]">
              VBUCKS BARATO
            </span>
          </motion.div>

          {/* Links */}
          <div className="flex items-center gap-8">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="relative font-body text-[11px] text-muted-foreground uppercase tracking-[0.15em] transition-all duration-300 hover:text-foreground group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          {/* Copyright */}
          <div className="font-body text-[10px] text-muted-foreground/60 tracking-wider">
            © 2026 VBucks Barato — Todos os direitos reservados
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
