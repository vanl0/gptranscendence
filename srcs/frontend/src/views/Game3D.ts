// src/views/Game3D.ts
import { mountGame3D } from "../pong/render3d/scene";

export function renderGame3D(app: HTMLElement) {
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100vh";
  container.style.position = "relative";
  app.appendChild(container);

  mountGame3D(container, (winner: number) => {
    console.log("Winner:", winner);
    location.hash = "#/results";
  });
}
