import { registerUser } from "../lib/api";

function setMessage(el: HTMLElement, message: string, type: "idle" | "success" | "error" | "loading") {
  const base = "mt-4 text-sm font-medium transition-colors";
  let color = "text-gray-200";
  if (type === "success") color = "text-emerald-300";
  else if (type === "error") color = "text-rose-300";
  else if (type === "loading") color = "text-sky-200";
  el.className = `${base} ${color}`;
  el.textContent = message;
}

export function renderRegister(root: HTMLElement) {
  const container = document.createElement("div");
  container.className =
    "flex flex-col justify-center items-center min-h-screen py-12 px-4 text-gray-100";

  container.innerHTML = `
    <div class="w-full max-w-md bg-black/40 border border-white/10 rounded-2xl shadow-xl p-8 backdrop-blur">
      <h1 class="text-4xl font-honk text-center mb-6">Create account</h1>
      <p class="text-center text-gray-300 text-sm mb-8">
        Register to keep track of your matches and play with friends.
      </p>
      <form class="flex flex-col gap-5" novalidate>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold uppercase tracking-wide text-gray-200">Username</span>
          <input
            name="username"
            type="text"
            autocomplete="username"
            class="bg-gray-900/70 border border-white/10 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            placeholder="pongchamp"
            required
          />
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold uppercase tracking-wide text-gray-200">Password</span>
          <input
            name="password"
            type="password"
            autocomplete="new-password"
            class="bg-gray-900/70 border border-white/10 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            required
          />
        </label>
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold uppercase tracking-wide text-gray-200">Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="bg-gray-900/70 border border-white/10 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            required
          />
        </label>
        <button
          type="submit"
          class="mt-2 inline-flex justify-center items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-bit text-lg tracking-wide text-gray-900 transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          Create account
        </button>
        <p class="text-center text-xs text-gray-400">
          Already registered? <a href="#/" class="text-cyan-300 hover:text-cyan-200">Go back home</a>
        </p>
        <div data-message></div>
      </form>
    </div>
  `;

  const form = container.querySelector("form") as HTMLFormElement;
  const submitButton = form.querySelector("button[type=submit]") as HTMLButtonElement;
  const messageEl = form.querySelector("[data-message]") as HTMLDivElement;
  setMessage(messageEl, "", "idle");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const username = (formData.get("username") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    const confirmPassword = (formData.get("confirmPassword") || "").toString();

    if (!username || !password) {
      setMessage(messageEl, "Please fill in both username and password.", "error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage(messageEl, "Passwords do not match.", "error");
      return;
    }

    try {
      submitButton.disabled = true;
      setMessage(messageEl, "Creating your account...", "loading");
      const result = await registerUser({ username, password });
      setMessage(
        messageEl,
        `Welcome aboard, ${result.username}! Your account was created successfully.`,
        "success"
      );
      form.reset();
    } catch (error) {
      const err = error as { message?: string };
      setMessage(messageEl, err?.message || "Unable to create account. Please try again.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  root.appendChild(container);
}
