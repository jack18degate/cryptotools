// ==============================
// Simple Hash Router
// ==============================

const routes = {};
let currentCleanup = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getParams() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  return { hash, parts };
}

export function startRouter() {
  async function handleRoute() {
    const hash = window.location.hash.slice(1) || '/';

    // Cleanup previous page
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    // Find matching route
    let matched = false;
    for (const [pattern, handler] of Object.entries(routes)) {
      const params = matchRoute(pattern, hash);
      if (params !== null) {
        const cleanup = await handler(params);
        if (typeof cleanup === 'function') {
          currentCleanup = cleanup;
        }
        matched = true;
        break;
      }
    }

    if (!matched && routes['*']) {
      await routes['*']({});
    }

    // Scroll to top on navigation
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function matchRoute(pattern, hash) {
  const patternParts = pattern.split('/').filter(Boolean);
  const hashParts = hash.split('/').filter(Boolean);

  if (pattern === '/' && (hash === '/' || hash === '')) return {};

  if (patternParts.length !== hashParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(hashParts[i]);
    } else if (patternParts[i] !== hashParts[i]) {
      return null;
    }
  }
  return params;
}
