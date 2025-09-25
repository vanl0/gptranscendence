// src/views/Game3D.ts
export function renderGame3D(root: HTMLElement) {
  // Contenedor principal
  const container = document.createElement("div");
  container.className =
    "flex flex-col justify-between items-center h-screen pt-[2vh] pb-[2vh] min-h-[400px] min-w-[600px] relative mx-auto my-auto";

  container.innerHTML = `
    <h1 class="font-honk text-[5vh]">Pong 3D</h1>

    <div id="game3d-container" class="relative h-[80vh] aspect-[16/9]
                max-w-[calc(100vw-100px)] max-h-[calc(100vh-140px)]
                min-w-[300px] min-h-[200px]">
      <canvas id="game3d-canvas" class="w-full h-full border border-gray-500 rounded bg-black"></canvas>
      <div id="webgl-warning" class="hidden absolute inset-0 flex items-center justify-center text-center">
        <p class="font-bit text-[2.5vh] text-red-300">
          WebGL no está disponible en este navegador o dispositivo.
        </p>
      </div>
    </div>

    <a id="back-home" href="#/"
      class="flex items-center justify-center w-[25vw] h-[5vh] rounded-full min-w-[300px]
             border-2 border-gray-100 text-gray-100 font-bit text-[3vh]
             transition-colors duration-300 hover:bg-gray-100 hover:text-cyan-900">
      Back Home
    </a>
  `;

  root.innerHTML = "";
  root.appendChild(container);

  // Referencias
  const canvas = container.querySelector<HTMLCanvasElement>("#game3d-canvas")!;
  const backHomeButton = container.querySelector<HTMLAnchorElement>("#back-home")!;
  const warn = container.querySelector<HTMLDivElement>("#webgl-warning")!;
  const holder = container.querySelector<HTMLDivElement>("#game3d-container")!;

  // Inicializar WebGL
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    warn.classList.remove("hidden");
    // Devuelve una cleanup vacía para mantener contrato
    return () => {};
  }

  // Ajustar tamaño del canvas a CSS pixels → device pixels
  function resizeCanvasToDisplaySize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    (gl as WebGLRenderingContext).viewport(0, 0, canvas.width, canvas.height);
  }

  // Estado simple para demo
  let running = true;
  let frame = 0;

  // Demo: limpiado con color cambiante
  function draw() {
    if (!running) return;
    frame++;

    resizeCanvasToDisplaySize();

    const t = (frame % 300) / 300; // 0..1
    const r = 0.1 + 0.9 * Math.abs(Math.sin(t * Math.PI * 2));
    const g = 0.1 + 0.9 * Math.abs(Math.sin((t + 0.33) * Math.PI * 2));
    const b = 0.1 + 0.9 * Math.abs(Math.sin((t + 0.66) * Math.PI * 2));

    (gl as WebGLRenderingContext).clearColor(r, g, b, 1.0);
    (gl as WebGLRenderingContext).clear((gl as WebGLRenderingContext).COLOR_BUFFER_BIT);

    requestAnimationFrame(draw);
  }

  // Eventos
  const onResize = () => resizeCanvasToDisplaySize();
  window.addEventListener("resize", onResize);

  // Empezar
  resizeCanvasToDisplaySize();
  requestAnimationFrame(draw);

  // Volver a Home: limpiar antes de salir
  backHomeButton.addEventListener("click", () => {
    running = false;
    window.removeEventListener("resize", onResize);
  });

  // Devolver cleanup por si la vista se desmonta programáticamente
  return () => {
    running = false;
    window.removeEventListener("resize", onResize);
  };
}
