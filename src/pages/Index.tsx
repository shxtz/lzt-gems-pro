import { useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import VBucksSection from "@/components/VBucksSection";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturesSection from "@/components/FeaturesSection";
import FloatingChat from "@/components/FloatingChat";
import Footer from "@/components/Footer";

const sections = ["hero", "vbucks", "categories", "features"] as const;

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToNext = useCallback((currentId: string) => {
    const idx = sections.indexOf(currentId as typeof sections[number]);
    const nextId = sections[idx + 1];
    if (nextId) {
      document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto snap-container bg-background"
    >
      <Navbar />
      <section id="hero" className="snap-section">
        <HeroSection onScrollNext={() => scrollToNext("hero")} />
      </section>
      <section id="vbucks" className="snap-section">
        <VBucksSection />
      </section>
      <section id="categories" className="snap-section">
        <CategoriesSection />
      </section>
      <section id="features" className="snap-section relative">
        <FeaturesSection />
        <Footer />
      </section>
      <FloatingChat />
    </div>
  );
};

export default Index;
