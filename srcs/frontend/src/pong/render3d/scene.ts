import {
  Engine, Scene, ArcRotateCamera, Vector3,
  HemisphericLight, MeshBuilder, GlowLayer
} from "@babylonjs/core";
import { startPong } from "../startPong";
import type { GameConfig, GameState } from "../types";

export function createScene3D(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const engine = new Engine(canvas, true, { antialias: true, preserveDrawingBuffer: true });
  const scene = new Scene(engine);

  const cam = new ArcRotateCamera("cam", Math.PI/2, Math.PI/3, 80, Vector3.Zero(), scene);
  cam.attachControl(canvas, true);
  new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  new GlowLayer("glow", scene);

  // Plano “visual” (no afecta a tu física)
  const table = MeshBuilder.CreateGround("table", { width: 100, height: 60 }, scene);

  // Palas y bola
  const left  = MeshBuilder.CreateBox("left",  { width: 1.2, height: 2, depth: 10 }, scene);
  const right = MeshBuilder.CreateBox("right", { width: 1.2, height: 2, depth: 10 }, scene);
  left.position.x  = -48;
  right.position.x =  48;

  const ball = MeshBuilder.CreateSphere("ball", { diameter: 2 }, scene);
  ball.position.y = 1;

  // Fondo parecido al 2D
  scene.clearColor.set(0.03, 0.2, 0.27, 1);

  const handleResize = () => engine.resize();
  window.addEventListener("resize", handleResize);

  return {
    engine,
    scene,
    canvas,
    cleanup: () => window.removeEventListener("resize", handleResize),
    meshes: { table, left, right, ball }
  };
}

/** Mapea tu estado 2D (en píxeles) a coordenadas 3D “visuales” */
export function updateMeshesFromState(
  meshes: { left:any; right:any; ball:any },
  state: GameState,
  c: GameConfig,
  canvas2D: HTMLCanvasElement
) {
  // 0..w → -50..50 ; 0..h → -30..30
  const toX = (x:number) => (x / canvas2D.width)  * 100 - 50;
  const toZ = (y:number) => (y / canvas2D.height) *  60 - 30;

  const leftX  = toX(20 + c.paddleWidth / 2);
  const rightX = toX(canvas2D.width - 20 - c.paddleWidth / 2);

  meshes.left.position.x  = leftX;
  meshes.right.position.x = rightX;

  meshes.left.position.z  = toZ(state.paddle1Y + c.paddleHeight / 2);
  meshes.right.position.z = toZ(state.paddle2Y + c.paddleHeight / 2);

  meshes.ball.position.x  = toX(state.ballX + c.ballSize / 2);
  meshes.ball.position.z  = toZ(state.ballY + c.ballSize / 2);
}

type PongCleanupHandle = (() => void) & {
  getState?: () => GameState;
  getConfig?: () => GameConfig;
  getCanvas?: () => HTMLCanvasElement;
};

export function mountGame3D(
  container: HTMLElement,
  onGameOver: (winner: number) => void
) {
  const { engine, scene, canvas, meshes, cleanup: cleanupScene } = createScene3D(container);

  const canvas2D = document.createElement("canvas");
  canvas2D.style.position = "absolute";
  canvas2D.style.top = "0";
  canvas2D.style.left = "0";
  canvas2D.style.width = "100%";
  canvas2D.style.height = "100%";
  canvas2D.style.opacity = "0";
  canvas2D.style.pointerEvents = "none";
  container.appendChild(canvas2D);

  let disposed = false;
  let cleanupPong: PongCleanupHandle;

  const renderLoop = () => {
    if (disposed) {
      return;
    }

    const state = cleanupPong?.getState?.();
    const config = cleanupPong?.getConfig?.();
    const referenceCanvas = cleanupPong?.getCanvas?.() ?? canvas2D;

    if (state && config && referenceCanvas) {
      updateMeshesFromState(meshes, state, config, referenceCanvas);
    }

    scene.render();
  };

  function teardown() {
    if (disposed) {
      return;
    }

    disposed = true;
    engine.stopRenderLoop(renderLoop);
    cleanupPong?.();
    cleanupScene();
    engine.dispose();

    if (canvas.parentElement === container) {
      container.removeChild(canvas);
    } else if (canvas.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }

    if (canvas2D.parentElement === container) {
      container.removeChild(canvas2D);
    } else if (canvas2D.parentElement) {
      canvas2D.parentElement.removeChild(canvas2D);
    }
  }

  cleanupPong = startPong(canvas2D, (winner) => {
    teardown();
    onGameOver(winner);
  }) as PongCleanupHandle;

  engine.runRenderLoop(renderLoop);

  return teardown;
}
