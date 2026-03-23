import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/30 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="VBucks Barato" className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-gradient-gold">
              VBUCKS BARATO
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/termos" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">
              Privacidade
            </Link>
            <Link to="/contato" className="font-body text-xs text-muted-foreground hover:text-primary transition-colors">
              Contato
            </Link>
          </div>

          <div className="font-body text-xs text-muted-foreground">
            © 2026 VBucks Barato. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
