import { Deck, OrthographicView } from '@deck.gl/core';
import { IconLayer, BitmapLayer } from '@deck.gl/layers';

const fixed = __PROPOSED_FIX__;
document.title = fixed ? 'deck.gl proposed iconAtlas fix' : 'deck.gl stale iconAtlas reproduction';
document.getElementById('variant').textContent = fixed
  ? 'Proposed fix: ignore superseded loads before releasing resources.'
  : 'Original deck.gl 9.4.0: reproduce the stale atlas bug.';
document.getElementById(fixed ? 'fixed-demo' : 'original-demo').setAttribute('aria-current', 'page');
document.getElementById('expectation').textContent = fixed
  ? 'After step 2, the icon stays circular, the blank cell stays transparent, and destroyed stays false. Reload to repeat.'
  : 'After step 2, the icon becomes stripes, the blank cell becomes a square, and destroyed becomes true. Reload to repeat.';

const report = document.getElementById('report');
const newerButton = document.getElementById('new');
const olderButton = document.getElementById('old');
const data = [
  { position: [-100, 0], icon: 'user' },
  { position: [100, 0], icon: 'blank' },
];
const mapping = {
  user: { x: 0, y: 0, width: 124, height: 124, mask: false },
  blank: { x: 126, y: 1, width: 1, height: 1, mask: false },
};

const atlasImage = new Image();
atlasImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="128">' +
  '<circle cx="62" cy="62" r="54" fill="#81a52f"/>' +
  '<rect x="38" y="38" width="48" height="48" fill="white"/>' +
  '</svg>'
);
await atlasImage.decode();

// The preceding bitmap leaves a distinctive texture bound, making sampling
// from a deleted atlas visible. It stands in for another textured draw.
const lookup = document.createElement('canvas');
lookup.width = 128;
lookup.height = 1;
const context = lookup.getContext('2d');
for (let x = 0; x < lookup.width; x++) {
  context.fillStyle = x % 2 === 0 ? '#81a52f' : 'white';
  context.fillRect(x, 0, 1, 1);
}
context.fillStyle = '#c6af22';
context.fillRect(15, 0, 3, 1);

let resolveOlder;
let resolveNewer;
const olderLoad = new Promise((resolve) => { resolveOlder = resolve; });
const newerLoad = new Promise((resolve) => { resolveNewer = resolve; });
let atlasRequest = olderLoad;
let phase = 'older-pending';

const makeLayers = () => [
  new BitmapLayer({
    id: 'lookup',
    image: lookup,
    bounds: [-40, 160, 40, 161],
    textureParameters: { minFilter: 'nearest', magFilter: 'nearest' },
  }),
  new IconLayer({
    id: 'icons',
    data,
    iconAtlas: atlasRequest,
    iconMapping: mapping,
    getIcon: (d) => d.icon,
    getPosition: (d) => d.position,
    getSize: 100,
    sizeUnits: 'pixels',
    alphaCutoff: -1,
  }),
];

const deck = new Deck({
  canvas: 'deck',
  width: 500,
  height: 300,
  views: new OrthographicView(),
  initialViewState: { target: [0, 0, 0], zoom: 0 },
  layers: makeLayers(),
  onAfterRender: () => {
    // Internal state is inspected only to report whether the active texture
    // was destroyed. The reproduction uses ordinary layer props and setProps.
    const iconLayer = deck.layerManager?.getLayers().find((layer) => layer.id === 'icons');
    if (!iconLayer) return;
    const texture = iconLayer.state?.iconManager?.getTexture();

    if (phase === 'older-pending') {
      newerButton.disabled = false;
      report.textContent = 'Older atlas is pending. Click button 1.';
    } else if (phase === 'newer-pending') {
      // Resolve only after the newer layer's async prop has been registered.
      phase = 'newer-resolving';
      resolveNewer(atlasImage);
    } else if (phase === 'newer-resolving' && texture) {
      phase = 'newer-active';
      olderButton.disabled = false;
    }

    if (texture) {
      report.textContent = JSON.stringify({
        phase,
        destroyed: texture.destroyed,
        width: texture.width,
        height: texture.height,
      }, null, 2);
    }
  },
});

newerButton.onclick = () => {
  newerButton.disabled = true;
  atlasRequest = newerLoad;
  phase = 'newer-pending';
  deck.setProps({ layers: makeLayers() });
};
olderButton.onclick = () => {
  olderButton.disabled = true;
  phase = 'older-resolved';
  resolveOlder(atlasImage);
  // A rejected stale update does not necessarily schedule a redraw.
  setTimeout(() => deck.redraw(true), 50);
};
