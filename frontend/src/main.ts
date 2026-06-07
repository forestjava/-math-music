import { mountPlayer } from "./ui/player";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Root element #app not found");
}
mountPlayer(app);
