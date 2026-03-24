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
    <footer className="relative overflow-hidden py-8">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="VBucks Barato" className="h-8 w-8" />
            <span className="font-display text-sm font-bold text-gradient-gold tracking-[0.2em]">
              VBUCKS BARATO
            </span>
          </div>

          {/* Copyright + Made by */}
          <div className="font-body text-[11px] text-muted-foreground/60 tracking-wider">
            © 2026 VBucks Barato - Made by{" "}
            <a
              href="https://discord.gg/zqM7BuJubw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors underline"
            >
              Ajazz & Bypass
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
