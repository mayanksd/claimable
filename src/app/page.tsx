import { Nav } from "@/components/Nav";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { cachedAnswers, demoExtraction, demoRedactions } from "@/lib/demo";

export default function Home() {
  return (
    <>
      <Nav sample />
      <Dashboard extraction={demoExtraction} redactions={demoRedactions} cachedAnswers={cachedAnswers} />
    </>
  );
}
