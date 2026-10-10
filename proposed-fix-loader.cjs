// Reject a superseded load before its release/transform hooks touch resources.
const originalGuard =
  /(\.then\(data => \{\s*)if \(!this\.component\) \{(\s*)\/\/ This component state has been finalized/;

module.exports = function proposedFix(source) {
  const patched = source.replace(
    originalGuard,
    '$1if (!this.component || loadCount !== asyncProp.pendingLoadCount) {$2// Ignore finalized components and superseded loads before releasing resources.'
  );
  if (patched === source) {
    throw new Error('ComponentState no longer matches the proposed fix; review the deck.gl version.');
  }
  return patched;
};

module.exports.modulePattern =
  /[\\/]@deck\.gl[\\/]core[\\/](?:dist|dist\.webgl-only)[\\/]lifecycle[\\/]component-state\.js$/;
