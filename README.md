# deck.gl stale iconAtlas reproduction

This standalone browser fixture compares deck.gl 9.4.0 with a proposed resource
lifetime fix. Both demos use luma.gl 9.4.2 and the same scene and button handlers.
It has no Grafana or Mapgl runtime dependencies.

Use Node.js 20.19+ on the 20.x line, or 22.12+.

```sh
npm install
npm start
```

Open either page in a browser with WebGL enabled:

| Demo | URL | After the older load completes |
| --- | --- | --- |
| Original bug | http://127.0.0.1:3210/ | Striped SVG, yellow square, `destroyed: true` |
| Proposed fix | http://127.0.0.1:3210/fixed/ | Correct SVG, transparent blank cell, `destroyed: false` |

The navigation links switch between them. Use the local HTTP server; opening
index.html directly as a file does not load either bundle.

1. Click **1. Resolve newer atlas first**. A green circular icon appears on the
   left. The right-hand icon is transparent. The report shows `destroyed: false`.
2. Click **2. Resolve older atlas afterwards**. The original demo corrupts both
   icons and reports `destroyed: true`. The fixed demo preserves the SVG and the
   transparent cell and reports `destroyed: false`.
3. Reload the page to repeat.

Both loads are controlled promises for `IconLayer.iconAtlas`. Resolving the
older one after the newer one makes the resource lifetime race deterministic.
The preceding `BitmapLayer` deliberately binds a recognizable lookup texture,
which makes the incorrect sampling visible. The atlas contains an SVG icon and
a transparent one-pixel cell. The core lifetime race does not depend on SVG.

Expected behavior: the older completion is ignored before resource release or
transformation, leaving the current texture alive and the display unchanged.

## Proposed change

In `modules/core/src/lifecycle/component-state.ts`, inside `_watchPromise`,
check whether the request is still current **before** `_postProcessValue`:

```diff
- if (!this.component) {
+ if (!this.component || loadCount !== asyncProp.pendingLoadCount) {
    return;
  }
  data = this._postProcessValue(asyncProp, data);
```

The existing stale-result check in `_setAsyncPropValue` runs after the release
and transform hooks. A late older completion therefore releases the current
texture and creates a resource that is subsequently rejected. The proposed
guard prevents both side effects and makes the latest requested load win.

`proposed-fix-loader.cjs` applies this change to deck.gl's compiled
`ComponentState` while building the fixed bundle. It fails if the expected code
is absent. The original bundle uses the installed dependency unchanged; each
bundle runs the same `main.js`. The loader is a portable demonstration of the
proposed source change.

The build uses deck.gl's `visgl:webgl-only` distribution. `npm start` builds and
serves both demos; press Ctrl+C to stop. Set `PORT` to use another local port.
Source files and package-lock.json can be shared through Git; node_modules and
dist are generated locally and ignored.

## GitHub Pages

`npm run build` produces a complete static site in `dist/`, including both
HTML pages and their bundles. Relative links work under a GitHub project path.

The Pages workflow installs the locked dependencies, builds both demos, and
deploys `dist/` when `main` changes. Enable it once in the repository's
**Settings → Pages → Build and deployment → Source → GitHub Actions**.
If the first run happened before enabling Pages, rerun it from the Actions tab.

Once deployed, the public demo addresses are:

- Original bug: https://vaduga.github.io/async-iconatlas-bug/
- Proposed fix: https://vaduga.github.io/async-iconatlas-bug/fixed/
