import logo from "@/assets/logo.png";
import { motion } from "framer-motion";

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
              className="relative inline-block group"
            >
              <motion.span
                className="relative font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(90deg, #c8a96e, #f5d98a, #ffe6a0, #f5d98a, #c8a96e, #f5d98a, #ffe6a0, #f5d98a, #c8a96e)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                Ajazz & Bypass
              </motion.span>
              <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
