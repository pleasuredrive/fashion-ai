import type { Metadata } from "next";
import { StudioApp } from "./studio-app";

export const metadata: Metadata = {
  title: "TwelveFrame — AI reel production studio",
  description: "Plan, prompt and generate twelve consistent six-second clips with one Gemini API key.",
};

export default function Home() {
  return <StudioApp />;
}
