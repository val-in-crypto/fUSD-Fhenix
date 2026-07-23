import Hero from "@/components/hero/Hero";
import FeatureTriplet from "@/components/sections/FeatureTriplet";
import BackedBy from "@/components/sections/BackedBy";
import RebuildingValue from "@/components/sections/RebuildingValue";
import SoftwareModes from "@/components/sections/SoftwareModes";
import DualMode from "@/components/sections/DualMode";
import SiteFooter from "@/components/sections/SiteFooter";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureTriplet />
      <BackedBy />
      <RebuildingValue />
      <SoftwareModes />
      <DualMode />
      <SiteFooter />
    </>
  );
}
