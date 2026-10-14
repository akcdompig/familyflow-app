import { createRoot } from "react-dom/client";
import { FamilyFlowApp } from "@/components/FamilyFlowApp";

/* Losse preview zonder Next.js: dezelfde componenten, gebundeld met esbuild.
   Handig om op een telefoon te testen. Het echte project draait met `npm run dev`. */
const el = document.getElementById("root");
if (el) createRoot(el).render(<FamilyFlowApp />);
