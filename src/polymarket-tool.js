/**
 * Polymarket Insights Italia — Embedded in Crypto DeFi Tools
 * This wrapper initializes the Polymarket sub-app inside a tab container.
 */

import './polymarket/polymarket.css';
import { route, startRouter, navigate } from './polymarket/router.js';
import { renderDashboard } from './polymarket/pages/dashboard.js';
import { renderMarketDetail } from './polymarket/pages/market.js';
import { renderSearch } from './polymarket/pages/search.js';
import { renderCategories } from './polymarket/pages/categories.js';
import { renderHeader } from './polymarket/components/header.js';

let initialized = false;
let cleanup = null;

export function renderPolymarketTool() {
  return `
    <div class="pm-scope" id="pm-app">
      <div class="pm-loading">
        <div class="spinner"></div>
        <span>Caricamento Polymarket Insights...</span>
      </div>
    </div>
  `;
}

export function initPolymarketTool() {
  const pmApp = document.getElementById('pm-app');
  if (!pmApp) return;

  // Render the Polymarket shell
  pmApp.innerHTML = `
    ${renderHeader()}
    <main class="pm-main-content" id="pm-page-content"></main>
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-disclaimer">
          <p class="footer-brand">Polymarket Insights Italia 🇮🇹</p>
          <p>Dati forniti dall'API pubblica di <a href="https://polymarket.com" target="_blank" rel="noopener">Polymarket</a>.</p>
          <div class="footer-legal">
            <p>⚠️ <strong>Disclaimer:</strong> Questo sito <strong>non è affiliato, sponsorizzato o approvato da Polymarket</strong>. È un progetto indipendente a scopo esclusivamente <strong>statistico, didattico e di intrattenimento</strong>.</p>
            <p>🚫 Questo sito <strong>non permette di effettuare scommesse</strong> né transazioni di alcun tipo.</p>
          </div>
        </div>
      </div>
    </footer>
  `;

  // Bind Polymarket navigation events
  pmApp.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.dataset.nav;
      navigate(target);
      pmApp.querySelector('.pm-main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Bind search
  const searchInput = pmApp.querySelector('#nav-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        navigate(`/search/${encodeURIComponent(searchInput.value.trim())}`);
        searchInput.value = '';
      }
    });
  }

  // Mobile toggle
  const mobileToggle = pmApp.querySelector('#mobile-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      pmApp.querySelector('#nav-links')?.classList.toggle('open');
    });
  }

  // Event delegation for detail links
  pmApp.addEventListener('click', (e) => {
    const detailLink = e.target.closest('[data-nav-detail]');
    if (detailLink) {
      e.preventDefault();
      e.stopPropagation();
      navigate(`/market/${detailLink.dataset.navDetail}`);
    }
  });

  // Setup routes (only once)
  if (!initialized) {
    const getPage = () => document.getElementById('pm-page-content');

    route('/', async () => {
      updatePmActiveNav('/');
      return renderDashboard(getPage());
    });

    route('/categories', async () => {
      updatePmActiveNav('/categories');
      return renderCategories(getPage());
    });

    route('/search/:query', async (params) => {
      updatePmActiveNav('/search/trending');
      return renderSearch(getPage(), params.query);
    });

    route('/market/:id', async (params) => {
      updatePmActiveNav('');
      return renderMarketDetail(getPage(), params.id);
    });

    route('*', async () => {
      updatePmActiveNav('/');
      return renderDashboard(getPage());
    });

    startRouter();
    initialized = true;
  } else {
    // If already initialized, trigger a navigation to refresh
    const currentHash = window.location.hash.slice(1) || '/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

function updatePmActiveNav(path) {
  const pmApp = document.getElementById('pm-app');
  if (!pmApp) return;
  pmApp.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === path);
  });
}

export function destroyPolymarketTool() {
  // Reset hash when leaving the tab
  if (window.location.hash.startsWith('#/')) {
    // Don't clear hash — the Polymarket router will handle it
  }
}
