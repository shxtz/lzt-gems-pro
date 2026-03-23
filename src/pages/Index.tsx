import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import VBucksSection from "@/components/VBucksSection";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturesSection from "@/components/FeaturesSection";
import FloatingChat from "@/components/FloatingChat";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <VBucksSection />
      <CategoriesSection />
      <FeaturesSection />
      <Footer />
      <FloatingChat />
    </div>
  );
};

export default Index;
