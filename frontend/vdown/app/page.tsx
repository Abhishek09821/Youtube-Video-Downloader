import CinemaBackground from "@/components/background/CinemaBackground";
import IntroSequence from "@/components/intro/IntroSequence";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Downloader from "@/components/sections/Downloader";
import SpeedometerStats from "@/components/sections/SpeedometerStats";
import FeaturesHUD from "@/components/sections/FeaturesHUD";
import FormatsDashboard from "@/components/sections/FormatsDashboard";
import CtaPanel from "@/components/sections/CtaPanel";
import OutroSequence from "@/components/outro/OutroSequence";

export default function Home() {
  return (
    <>
      <IntroSequence />
      <CinemaBackground />
      <Navbar />
      <main className="relative">
        <Hero />
        <Downloader />
        <SpeedometerStats />
        <FeaturesHUD />
        <FormatsDashboard />
        <CtaPanel />
      </main>
      <Footer />
      <OutroSequence />
    </>
  );
}
