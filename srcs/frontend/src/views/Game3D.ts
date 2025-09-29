// src/views/Game3D.ts
import { GameConfig, GameState, KeyState } from "../pong/types";
import { setupInput } from "../pong/input";
import { update } from "../pong/update";

type Mat4 = Float32Array;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "";
    gl.deleteShader(shader);
    throw new Error(`Error compilando shader: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram();
  if (!program) throw new Error("No se pudo crear el programa");
  const vShader = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "";
    gl.deleteProgram(program);
    throw new Error(`Error enlazando programa: ${info}`);
  }
  gl.deleteShader(vShader);
  gl.deleteShader(fShader);
  return program;
}

function mat4Create(): Mat4 {
  return new Float32Array(16);
}

function mat4Identity(out: Mat4) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}

function mat4Multiply(out: Mat4, a: Mat4, b: Mat4) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
  const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
  const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
  const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

  out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
  out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
  out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
  out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
  out[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
  out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
  out[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
  out[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
  out[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
  out[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
  out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
  out[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
  out[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
  out[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
  out[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
  out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;
  return out;
}

function mat4Translate(out: Mat4, a: Mat4, v: [number, number, number]) {
  const x = v[0], y = v[1], z = v[2];
  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  }
  return out;
}

function mat4Scale(out: Mat4, a: Mat4, v: [number, number, number]) {
  const x = v[0], y = v[1], z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}

function mat4Perspective(out: Mat4, fovy: number, aspect: number, near: number, far: number) {
  const f = 1.0 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) / (near - far);
  out[15] = 0;
  return out;
}

function mat4LookAt(out: Mat4, eye: [number, number, number], center: [number, number, number], up: [number, number, number]) {
  let x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, z0: number, z1: number, z2: number;
  let len: number;

  const eyex = eye[0], eyey = eye[1], eyez = eye[2];
  const upx = up[0], upy = up[1], upz = up[2];
  const centerx = center[0], centery = center[1], centerz = center[2];

  if (
    Math.abs(eyex - centerx) < 0.000001 &&
    Math.abs(eyey - centery) < 0.000001 &&
    Math.abs(eyez - centerz) < 0.000001
  ) {
    return mat4Identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;

  len = Math.hypot(z0, z1, z2);
  z0 /= len;
  z1 /= len;
  z2 /= len;

  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);
  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    x0 /= len;
    x1 /= len;
    x2 /= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;

  len = Math.hypot(y0, y1, y2);
  if (len) {
    y0 /= len;
    y1 /= len;
    y2 /= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

function degToRad(v: number) {
  return (v * Math.PI) / 180;
}

function createBoxGeometry() {
  return new Float32Array([
    // Front face
    -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5,
    -0.5, 0.5, -0.5,
    0.5, 0.5, -0.5,
    -0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    0.5, -0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5,
    -0.5, 0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, -0.5,
    0.5, 0.5, 0.5,
    0.5, 0.5, -0.5,
    // Bottom face
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, -0.5, 0.5,
    -0.5, -0.5, -0.5,
    0.5, -0.5, 0.5,
    -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    0.5, 0.5, 0.5,
    0.5, -0.5, -0.5,
    0.5, 0.5, 0.5,
    0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5,
    -0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5,
    -0.5, -0.5, -0.5,
    -0.5, 0.5, 0.5,
    -0.5, 0.5, -0.5,
  ]);
}

function createConfig(canvas: HTMLCanvasElement): GameConfig {
  const width = canvas.width || canvas.clientWidth || 1;
  const height = canvas.height || canvas.clientHeight || 1;
  return {
    paddleHeight: height / 6,
    paddleWidth: width / 40,
    paddleSpeed: height / 80,
    ballSize: width / 40,
    minSpeedX: width / 160,
    maxSpeedX: width / 80,
    maxBounceAngle: Math.PI / 4,
  };
}

function createState(canvas: HTMLCanvasElement, config: GameConfig): GameState {
  const width = canvas.width || canvas.clientWidth || 1;
  const height = canvas.height || canvas.clientHeight || 1;
  return {
    paddle1Y: height / 2 - config.paddleHeight / 2,
    paddle2Y: height / 2 - config.paddleHeight / 2,
    ballX: width / 2 - config.ballSize / 2,
    ballY: height / 2 - config.ballSize / 2,
    ballSpeedX: Math.random() > 0.5 ? width / 300 : -width / 300,
    ballSpeedY:
      Math.random() > 0.5
        ? Math.random() * (width / 300)
        : Math.random() * -(width / 300),
    score1: 0,
    score2: 0,
    gameRunning: true,
    ballFlash: 0,
    paddle1Flash: 0,
    paddle2Flash: 0,
  };
}

function updateConfigFromCanvas(canvas: HTMLCanvasElement, config: GameConfig) {
  config.paddleHeight = canvas.height / 6;
  config.paddleWidth = canvas.width / 40;
  config.paddleSpeed = canvas.height / 80;
  config.ballSize = canvas.width / 40;
  config.minSpeedX = canvas.width / 160;
  config.maxSpeedX = canvas.width / 80;
}

function adjustStateForResize(state: GameState, widthRatio: number, heightRatio: number) {
  state.paddle1Y *= heightRatio;
  state.paddle2Y *= heightRatio;
  state.ballX *= widthRatio;
  state.ballY *= heightRatio;
  state.ballSpeedX *= widthRatio;
  state.ballSpeedY *= heightRatio;
}

export function renderGame3D(root: HTMLElement) {
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

  const canvas = container.querySelector<HTMLCanvasElement>("#game3d-canvas")!;
  const backHomeButton = container.querySelector<HTMLAnchorElement>("#back-home")!;
  const warn = container.querySelector<HTMLDivElement>("#webgl-warning")!;
  const holder = container.querySelector<HTMLDivElement>("#game3d-container")!;

  const maybeGl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as
    | WebGLRenderingContext
    | null;
  if (!maybeGl) {
    warn.classList.remove("hidden");
    return () => {};
  }
  const gl: WebGLRenderingContext = maybeGl;

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  const program = createProgram(
    gl,
    `attribute vec3 position;\nuniform mat4 u_matrix;\nvoid main() {\n  gl_Position = u_matrix * vec4(position, 1.0);\n}`,
    `precision mediump float;\nuniform vec4 u_color;\nvoid main() {\n  gl_FragColor = u_color;\n}`
  );

  const positionAttribute = gl.getAttribLocation(program, "position");
  const matrixUniform = gl.getUniformLocation(program, "u_matrix");
  const colorUniform = gl.getUniformLocation(program, "u_color");
  if (matrixUniform === null || colorUniform === null || positionAttribute === -1) {
    throw new Error("No se pudieron obtener los uniformes del shader");
  }

  const boxBuffer = gl.createBuffer();
  if (!boxBuffer) throw new Error("No se pudo crear el buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, boxBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, createBoxGeometry(), gl.STATIC_DRAW);

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionAttribute);
  gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 0, 0);

  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 flex flex-col";
  overlay.innerHTML = `
    <div class="pointer-events-none flex justify-between px-6 pt-4 text-gray-100 font-bit text-[3vh]">
      <span id="score-left">0</span>
      <span id="score-right">0</span>
    </div>
    <div class="flex-1 flex items-center justify-center">
      <div id="status-overlay" class="hidden pointer-events-auto">
        <div class="flex flex-col items-center gap-4 bg-black/70 px-8 py-6 rounded">
          <p id="status-text" class="font-bit text-[3vh] text-gray-100"></p>
          <button id="restart-btn"
            class="hidden bg-gray-100 text-cyan-900 px-5 py-2 rounded font-bit text-[2.5vh] transition-colors duration-300 hover:bg-white">
            Play again
          </button>
        </div>
      </div>
    </div>
    <div class="pointer-events-none pb-4 text-center text-gray-200 font-bit text-[2vh]">
      W/S &amp; ↑/↓ para mover • Space para pausar
    </div>
  `;
  holder.appendChild(overlay);

  const scoreLeft = overlay.querySelector<HTMLSpanElement>("#score-left")!;
  const scoreRight = overlay.querySelector<HTMLSpanElement>("#score-right")!;
  const statusOverlay = overlay.querySelector<HTMLDivElement>("#status-overlay")!;
  const statusText = overlay.querySelector<HTMLParagraphElement>("#status-text")!;
  const restartButton = overlay.querySelector<HTMLButtonElement>("#restart-btn")!;

  const config = createConfig(canvas);
  let state = createState(canvas, config);
  const keys: KeyState = {};
  const cleanupInput = setupInput(keys);

  let paused = false;
  let winner: number | null = null;
  let running = true;
  let animationId: number | null = null;

  const projectionMatrix = mat4Create();
  const viewMatrix = mat4Create();
  const viewProjectionMatrix = mat4Create();
  const modelMatrix = mat4Create();
  const mvpMatrix = mat4Create();

  function setStatus(message: string | null, showButton = false) {
    if (!message) {
      statusOverlay.classList.add("hidden");
      restartButton.classList.add("hidden");
      statusText.textContent = "";
      return;
    }
    statusOverlay.classList.remove("hidden");
    statusText.textContent = message;
    if (showButton) {
      restartButton.classList.remove("hidden");
    } else {
      restartButton.classList.add("hidden");
    }
  }

  function restartGame() {
    winner = null;
    paused = false;
    state = createState(canvas, config);
    Object.keys(keys).forEach((k) => (keys[k] = false));
    setStatus(null);
  }

  restartButton.addEventListener("click", () => {
    restartGame();
  });

  function resizeCanvasToDisplaySize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const displayWidth = Math.floor(canvas.clientWidth * dpr);
    const displayHeight = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      const prevWidth = canvas.width || displayWidth;
      const prevHeight = canvas.height || displayHeight;
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      const widthRatio = displayWidth / (prevWidth || 1);
      const heightRatio = displayHeight / (prevHeight || 1);
      adjustStateForResize(state, widthRatio, heightRatio);
      updateConfigFromCanvas(canvas, config);
      state.paddle1Y = Math.min(canvas.height - config.paddleHeight, Math.max(0, state.paddle1Y));
      state.paddle2Y = Math.min(canvas.height - config.paddleHeight, Math.max(0, state.paddle2Y));
      state.ballY = Math.min(canvas.height - config.ballSize, Math.max(0, state.ballY));
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function mapX(pixel: number, worldWidth: number) {
    return (pixel / canvas.width - 0.5) * worldWidth;
  }

  function mapY(pixel: number, worldHeight: number) {
    return (0.5 - pixel / canvas.height) * worldHeight;
  }

  function drawBox(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: [number, number, number, number]) {
    mat4Identity(modelMatrix);
    mat4Translate(modelMatrix, modelMatrix, [x, y, z]);
    mat4Scale(modelMatrix, modelMatrix, [sx, sy, sz]);
    mat4Multiply(mvpMatrix, viewProjectionMatrix, modelMatrix);
    gl.uniformMatrix4fv(matrixUniform, false, mvpMatrix);
    gl.uniform4fv(colorUniform, color);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }

  function drawScene() {
    gl.clearColor(0.02, 0.07, 0.12, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = canvas.width / canvas.height;
    mat4Perspective(projectionMatrix, degToRad(55), aspect, 0.1, 100);
    mat4LookAt(viewMatrix, [0, 3.5, 8], [0, 0, 0], [0, 1, 0]);
    mat4Multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    const worldWidth = 10;
    const worldHeight = worldWidth * (canvas.height / canvas.width);

    drawBox(0, -1.2, 0, worldWidth, worldHeight + 1.5, 0.2, [0.03, 0.2, 0.3, 1]);
    drawBox(0, 0, 0.05, 0.08, worldHeight, 0.05, [0.8, 0.8, 0.8, 1]);

    const paddleDepth = 0.4;
    const paddleWidth = (config.paddleWidth / canvas.width) * worldWidth;
    const paddleHeight = (config.paddleHeight / canvas.height) * worldHeight;
    const paddleY1 = mapY(state.paddle1Y + config.paddleHeight / 2, worldHeight);
    const paddleY2 = mapY(state.paddle2Y + config.paddleHeight / 2, worldHeight);
    const paddleX1 = mapX(20 + config.paddleWidth / 2, worldWidth);
    const paddleX2 = mapX(canvas.width - 20 - config.paddleWidth / 2, worldWidth);

    drawBox(
      paddleX1,
      paddleY1,
      0.6,
      paddleWidth,
      paddleHeight,
      paddleDepth,
      state.paddle1Flash > 0 ? [0.3, 1, 0.5, 1] : [0.9, 0.9, 0.9, 1]
    );
    drawBox(
      paddleX2,
      paddleY2,
      -0.6,
      paddleWidth,
      paddleHeight,
      paddleDepth,
      state.paddle2Flash > 0 ? [0.3, 1, 0.5, 1] : [0.9, 0.9, 0.9, 1]
    );

    const ballSizeX = (config.ballSize / canvas.width) * worldWidth;
    const ballSizeY = (config.ballSize / canvas.height) * worldHeight;
    const ballX = mapX(state.ballX + config.ballSize / 2, worldWidth);
    const ballY = mapY(state.ballY + config.ballSize / 2, worldHeight);
    drawBox(
      ballX,
      ballY,
      0,
      ballSizeX,
      ballSizeY,
      0.35,
      state.ballFlash > 0 ? [0.4, 1, 0.6, 1] : [1, 1, 1, 1]
    );
  }

  function onGameOver(player: number) {
    winner = player;
    paused = false;
    setStatus(`Jugador ${player} gana!`, true);
  }

  function loop() {
    if (!running) return;
    resizeCanvasToDisplaySize();
    if (state.gameRunning && !paused) {
      update(canvas, state, config, keys, onGameOver);
    }
    drawScene();
    scoreLeft.textContent = `${state.score1}`;
    scoreRight.textContent = `${state.score2}`;
    if (paused && state.gameRunning) {
      setStatus("Pausa");
    } else if (!state.gameRunning && winner) {
      setStatus(`Jugador ${winner} gana!`, true);
    } else if (state.gameRunning) {
      setStatus(null);
    }
    animationId = requestAnimationFrame(loop);
  }

  const handlePause = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      if (!state.gameRunning) return;
      paused = !paused;
      if (!paused) {
        setStatus(null);
      }
    }
  };

  const onResize = () => resizeCanvasToDisplaySize();

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", handlePause);

  resizeCanvasToDisplaySize();
  loop();

  backHomeButton.addEventListener("click", () => {
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    setStatus(null);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("keydown", handlePause);
    cleanupInput();
  });

  return () => {
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("keydown", handlePause);
    cleanupInput();
  };
}
