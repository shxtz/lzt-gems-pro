import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.png";
import vbucksIcon from "@/assets/vbucks-icon.png";
import { Sparkles, ArrowRight, ChevronDown } from "lucide-react";
import { useRef } from "react";

const GoldParticle = ({ delay, x, size }: { delay: number; x: number; size: number }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      left: `${x}%`,
      bottom: "-5%",
      width: size,
      height: size,
      background: `radial-gradient(circle, hsl(43 84% 55% / 0.8), hsl(43 84% 55% / 0))`,
    }}
    animate={{
      y: [0, -800],
      x: [0, Math.sin(delay) * 60],
      opacity: [0, 0.8, 0.8, 0],
    }}
    transition={{
      duration: 6 + delay,
      repeat: Infinity,
      ease: "linear",
      delay: delay,
    }}
  />
);

const FloatingOrb = ({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      background: `radial-gradient(circle, hsl(43 84% 55% / 0.12), hsl(43 84% 55% / 0.03), transparent 70%)`,
      filter: "blur(1px)",
    }}
    animate={{
      y: [0, -30, 0],
      x: [0, 15, 0],
      scale: [1, 1.2, 1],
      opacity: [0.4, 0.8, 0.4],
    }}
    transition={{
      duration: 5 + delay,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  />
);

const HeroSection = ({ onScrollNext }: { onScrollNext?: () => void }) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img
          src={heroBg}
          alt=""
          className="h-full w-full object-cover sm:object-contain object-[65%_center] sm:object-center scale-125 sm:scale-100"
          style={{ imageRendering: "auto", backfaceVisibility: "hidden", transform: "translateZ(0)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-transparent h-[30%]" />
      </motion.div>

      {/* Animated grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] hidden sm:block">
        <motion.div
          animate={{ y: [0, 40] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(hsl(43 84% 55%) 1px, transparent 1px), linear-gradient(90deg, hsl(43 84% 55%) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Gold particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <GoldParticle
            key={i}
            delay={i * 0.9}
            x={5 + i * 10}
            size={2 + (i % 3) * 2}
          />
        ))}
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <FloatingOrb x="10%" y="20%" size={120} delay={0} />
        <FloatingOrb x="75%" y="15%" size={80} delay={1.5} />
        <FloatingOrb x="85%" y="60%" size={100} delay={3} />
        <FloatingOrb x="5%" y="70%" size={60} delay={2} />
      </div>

      {/* Radial gold glow - more intense */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[1000px] h-[500px] sm:h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(43 84% 55% / 0.08), transparent 60%)" }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 container mx-auto px-4 sm:px-6 text-center"
        style={{ y: contentY, opacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2 sm:gap-3 rounded-full border border-primary/60 bg-background/85 px-4 sm:px-7 py-2 sm:py-3 mb-5 sm:mb-8 backdrop-blur-xl shadow-gold"
            style={{ animation: "gold-breathe 3s ease-in-out infinite" }}
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary animate-pulse" />
            <span className="font-body text-[10px] sm:text-[14px] font-black text-foreground tracking-[0.12em] sm:tracking-[0.22em] uppercase drop-shadow-sm">
              Melhor preço do Brasil
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[3.2rem] sm:text-7xl md:text-8xl lg:text-[7rem] font-black leading-[0.92] mb-3 sm:mb-4 tracking-tight"
          >
            <span className="text-foreground block leading-none text-glow-gold">VBUCKS</span>
            <span className="text-gradient-gold-shine block leading-none -mt-1 sm:-mt-3 md:-mt-5 lg:-mt-7">BARATO</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="font-body text-xs sm:text-sm md:text-base text-foreground max-w-md sm:max-w-lg mx-auto mb-7 sm:mb-10 leading-relaxed tracking-wide"
          >
            V-Bucks e contas de jogos com os melhores&nbsp;preços.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Entrega instantânea e <span className="text-primary font-medium">segurança garantida</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <motion.button
              onClick={() => navigate("/vbucks")}
              whileHover={{ scale: 1.04, boxShadow: "0 8px 50px hsl(43 84% 55% / 0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="pulse-ring group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-gold px-5 sm:px-7 py-3 sm:py-3.5 font-display text-[11px] sm:text-[12px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-primary-foreground shadow-gold transition-all w-full sm:w-auto justify-center"
            >
              <motion.img
                src={vbucksIcon}
                alt="V-Bucks"
                className="relative z-10 h-7 w-7 sm:h-10 sm:w-10 -ml-1"
                style={{ animation: "vbucks-float 4s ease-in-out infinite" }}
              />
              <span className="relative z-10">Comprar V-Bucks</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              {/* Streak shine */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.25), transparent)",
                  width: "30%",
                  animation: "streak 3s ease-in-out infinite",
                }}
              />
            </motion.button>

            <motion.button
              onClick={() => navigate("/loja")}
              whileHover={{ scale: 1.04, borderColor: "hsl(43 84% 55% / 0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-3 rounded-2xl border border-border/60 glass px-9 py-3 sm:py-3.5 font-display text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-foreground transition-all duration-300 w-full sm:w-auto"
            >
              Ver Contas
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-10 sm:mt-20 flex items-center justify-center gap-0 max-w-md sm:max-w-xl mx-auto"
        >
          {[
            { value: "1.000+", label: "Clientes" },
            { value: "2.000+", label: "Vendas" },
            { value: "4.9★", label: "Avaliação" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.05 }}
              className={`flex-1 text-center py-3 sm:py-4 ${
                i < 2 ? "border-r border-border/30" : ""
              }`}
            >
              <div className="font-display text-lg sm:text-xl md:text-2xl font-bold text-gradient-gold mb-0.5">
                {stat.value}
              </div>
              <div className="font-body text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.button
        onClick={onScrollNext}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 cursor-pointer p-2 rounded-full hover:bg-primary/10 transition-colors hidden sm:block"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="h-6 w-6 text-primary/60" />
      </motion.button>
    </section>
  );
};

export default HeroSection;