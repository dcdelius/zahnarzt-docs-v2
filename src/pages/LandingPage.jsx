import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import StepsSection from '../components/landing/StepsSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import ContactSection from '../components/landing/ContactSection';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-b from-white to-blue-50 min-h-screen flex flex-col">
      <HeroSection />
      <FeaturesSection />
      <StepsSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </div>
  );
} 