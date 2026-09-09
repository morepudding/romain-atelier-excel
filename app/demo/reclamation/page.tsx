import type { Metadata } from "next";
import { ReclamationDemo } from "./components/ReclamationDemo";
import "./reclamation.css";

export const metadata: Metadata = { title: "Démo réclamation — Premier client" };

export default function ReclamationPage() {
  return <ReclamationDemo />;
}
