import { motion, useScroll, useTransform } from "framer-motion";
import heroBg from "@/assets/hero-bg.png";
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

const HeroSection = () => {
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
          className="h-[130%] w-full object-contain object-top scale-100"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 bg-background/30" />
      </motion.div>

      {/* Animated grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
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
        {[...Array(12)].map((_, i) => (
          <GoldParticle
            key={i}
            delay={i * 0.8}
            x={5 + i * 8}
            size={2 + (i % 3) * 2}
          />
        ))}
      </div>

      {/* Radial gold glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(43 84% 55% / 0.06), transparent 60%)" }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 container mx-auto px-6 text-center"
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
            className="inline-flex items-center gap-2.5 rounded-full glass-gold px-5 py-2 mb-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="font-body text-[11px] font-semibold text-primary tracking-[0.2em] uppercase">
              Melhor preço do Brasil
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[0.95] mb-4 tracking-tight"
          >
            <span className="text-foreground">V-BUCKS</span>
            <br />
            <span className="text-gradient-gold-shine">BARATO</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="font-body text-sm md:text-base text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed tracking-wide"
          >
            V-Bucks e contas de jogos com os melhores preços.
            <br className="hidden sm:block" />
            Entrega instantânea e <span className="text-primary font-medium">segurança garantida</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 8px 40px hsl(43 84% 55% / 0.3)" }}
              whileTap={{ scale: 0.97 }}
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-gold px-9 py-4 font-display text-[12px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold transition-all"
            >
              <span className="relative z-10">Comprar V-Bucks</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 -translate-x-full"
                animate={{ translateX: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.2), transparent)",
                  width: "50%",
                }}
              />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, borderColor: "hsl(43 84% 55% / 0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 rounded-2xl border border-border/60 glass px-9 py-4 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-foreground transition-all duration-300"
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
          className="mt-20 flex items-center justify-center gap-0 max-w-xl mx-auto"
        >
          {[
            { value: "10K+", label: "Clientes" },
            { value: "50K+", label: "Vendas" },
            { value: "4.9★", label: "Avaliação" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`flex-1 text-center py-4 ${
                i < 2 ? "border-r border-border/30" : ""
              }`}
            >
              <div className="font-display text-xl md:text-2xl font-bold text-gradient-gold mb-0.5">
                {stat.value}
              </div>
              <div className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="h-5 w-5 text-primary/40" />
      </motion.div>
    </section>
  );
};

export default HeroSection;
