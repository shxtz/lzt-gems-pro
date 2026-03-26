import { useRef, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import VBucksSection from "@/components/VBucksSection";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturesSection from "@/components/FeaturesSection";
import FloatingChat from "@/components/FloatingChat";
import Footer from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";

const sections = ["hero", "vbucks", "categories", "features"] as const;

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const isMobile = useIsMobile();

  const getCurrentSectionIndex = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 0;

    const currentScroll = container.scrollTop;
    const sectionOffsets = sections.map((id) => {
      const element = document.getElementById(id);
      return element?.offsetTop ?? 0;
    });

    return sectionOffsets.reduce((closestIndex, offset, index, arr) => {
      const closestOffset = arr[closestIndex] ?? 0;
      return Math.abs(offset - currentScroll) < Math.abs(closestOffset - currentScroll)
        ? index
        : closestIndex;
    }, 0);
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const targetId = sections[index];
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    isAnimatingRef.current = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(() => {
      isAnimatingRef.current = false;
    }, 850);
  }, []);

  const scrollToNext = useCallback((currentId: string) => {
    const idx = sections.indexOf(currentId as (typeof sections)[number]);
    if (idx >= 0 && idx < sections.length - 1) {
      scrollToSection(idx + 1);
    }
  }, [scrollToSection]);

  // Only enable snap scroll on desktop
  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 15) return;
      event.preventDefault();
      if (isAnimatingRef.current) return;

      const currentIndex = getCurrentSectionIndex();
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + direction));

      if (nextIndex !== currentIndex) {
        scrollToSection(nextIndex);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [getCurrentSectionIndex, scrollToSection, isMobile]);

  return (
    <div ref={containerRef} className={`h-screen overflow-y-auto bg-background ${isMobile ? '' : 'snap-container'}`}>
      <Navbar />
      <section id="hero" className={isMobile ? '' : 'snap-section'}>
        <HeroSection onScrollNext={() => scrollToNext("hero")} />
      </section>
      <section id="vbucks" className={isMobile ? '' : 'snap-section'}>
        <VBucksSection />
      </section>
      <section id="categories" className={isMobile ? '' : 'snap-section'}>
        <CategoriesSection />
      </section>
      <section id="features" className={`${isMobile ? '' : 'snap-section'} relative flex flex-col`}>
        <div className="flex-1">
          <FeaturesSection />
        </div>
        <Footer />
      </section>
      <FloatingChat />
    </div>
  );
};

export default Index;
