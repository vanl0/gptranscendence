import { API_BASE, INTERNAL_API_KEY, setAccessToken } from "../lib/api";

function resolveGatewayBase(): string {
  if (typeof window !== "undefined") {
    const { origin, port } = window.location;
    // When the SPA is served through the proxy (e.g. docker compose), reuse the same origin so
    // requests stay within the gateway and avoid CORS/TLS issues.
    if (port !== "5173") {
      return origin.replace(/\/$/, "");
    }
  }
  return API_BASE.replace(/\/$/, "");
}

function getInternalApiKey(): string | undefined {
  if (INTERNAL_API_KEY) return INTERNAL_API_KEY;
  console.warn(
    "Missing INTERNAL_API_KEY. Set VITE_INTERNAL_API_KEY in the frontend environment to allow calling protected API routes."
  );
  return undefined;
}

export function renderLogin(root: HTMLElement) {
  const container = document.createElement("div");
  container.className =
    "flex flex-col justify-center items-center min-h-[400px] min-w-[600px] gap-[2vh] pb-[5vh] h-screen";

  container.innerHTML = `

    <h1 class="font-honk text-[10vh] animate-wobble mb-[2vh]">Login</h1>
  <div class="flex flex-col items-center justify-center w-[30vw] bg-cyan-900/30 border-4 border-cyan-800 rounded-3xl p-[3vh] shadow-xl">
    <form id="login-form" 
          class="flex flex-col items-center gap-[2vh] w-[25vw]">
      <input type="text" 
             id="username"
             placeholder="Username"
             class="w-full px-4 py-2 rounded-full bg-transparent border-2 border-gray-100 text-gray-100 
                    placeholder-gray-400 font-bit text-[2.5vh] focus:outline-none focus:bg-gray-100 focus:text-cyan-900 transition-all duration-300" />

      <input type="password" 
             id="password"
             placeholder="Password"
             class="w-full px-4 py-2 rounded-full bg-transparent border-2 border-gray-100 text-gray-100 
                    placeholder-gray-400 font-bit text-[2.5vh] focus:outline-none focus:bg-gray-100 focus:text-cyan-900 transition-all duration-300" />

      <button type="submit"
              class="w-full py-2 rounded-full border-2 border-gray-100 text-gray-100 font-bit text-[3vh]
                     transition-all duration-300 hover:bg-gray-100 hover:text-cyan-900">
        Login
      </button>
    </form>
    </div>

    <div class="flex flex-col items-center mt-[2vh]">
      <p class="text-gray-300 font-bit text-[2vh]">Don’t have an account yet?</p>
      <a href="#/register"
         class="mt-[1vh] flex items-center justify-center w-[25vw] h-[7vh] rounded-full
                border-2 border-gray-100 text-gray-100 font-bit text-[3vh]
                transition-colors duration-300 hover:bg-gray-100 hover:text-cyan-900">
         Create Account
      </a>
    </div>
    
    <div class="w-[30vw] flex items-center justify-center mt-[4vh] mb-[2vh]">
      <div class="w-full border-t-4 border-cyan-800 rounded-full shadow-[0_0_10px_#164e63]"></div>
    </div>

    <a href="#/" 
       class="flex items-center justify-center w-[25vw] h-[7vh] mt-[3vh] rounded-full
              border-2 border-gray-100 text-gray-100 font-bit text-[3vh]
              transition-colors duration-300 hover:bg-gray-100 hover:text-cyan-900">
       Back Home
    </a>
  `;

  root.appendChild(container);

  const form = container.querySelector("#login-form") as HTMLFormElement;
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = (container.querySelector("#username") as HTMLInputElement).value;
    const password = (container.querySelector("#password") as HTMLInputElement).value;
    console.log("Login attempt:", { username, password });
    try {
      const gatewayBase = resolveGatewayBase();
      const url = `${gatewayBase}/api/users/login`;
      const headers: Record<string, string> = {
        "content-type": "application/json;charset=UTF-8",
      };
      const apiKey = getInternalApiKey();
      if (apiKey) headers["x-internal-api-key"] = apiKey;

      const response = await window.fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        console.error("Login failed:", payload);
        return;
      }

      const token = payload?.token;
      if (typeof token === "string" && token.length > 0) {
        setAccessToken(token);
        console.log("Login successful");
      } else {
        console.warn("Login succeeded but no token was returned.", payload);
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  });
}
