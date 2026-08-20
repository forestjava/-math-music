import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Player from "./ui/Player.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Player />
  </StrictMode>,
);
