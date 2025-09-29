**clone the project and run make in terminal.**

**To access the website, visit http://localhost:8080**

### Frontend live-reload during development

When you want to iterate on the TypeScript sources without rebuilding the
containers, start the Vite dev server profile:

```bash
docker compose --profile dev up frontend-dev
```

This boots a container that mounts `srcs/frontend` from your host and exposes
Vite on http://localhost:5173 with hot-module replacement.

Files saved under `srcs/frontend` (including `.ts` files) are recompiled and
refreshed automatically.

If you don't have a clue how anything works, this very simple pong game gives a good idea of the basic stuff:

https://www.geeksforgeeks.org/javascript/pong-game-in-javascript/


Code is written in TypeScript. Browser only understands JavaScript, so the TypeScript code is compiled to JavaScript thanks to Docker.

HTML page styled with CSS allows to introduce the different pages & elements of the website.

The drawing and physics of the pong game on a canvas is also done with TypeScript (pong.ts)

Using Docker, we can build a Docker Image with nginx and all the frontend files copied inside.

Implemented Tailwind!

**Why Tailwind?**

Allows us to style things more easily. Instead of having a long CSS file, we can write the details directly in HTML:

HTML
```
<button className="px-6 py-2 bg-stone-800 text-white rounded-xl shadow hover:bg-blue-500">
  Start Game
</button>
```

-> _No need to open/edit a separate stylesheet._

-> _Styles are consistent across components._

-> _Easy to prototype and keep the UI responsive._

We also have access to pretty cool-looking fonts (downloaded from Google Fonts [see styles.css + tailwind.config.js])

**Useful resources:**

- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API (the Canvas API is used to draw the pong game)

- https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API

- https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model

- https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API

- https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model

