/**
 * Crypto DeFi Tools — Main Entry Point
 * Sidebar navigation and routing between tools
 */
import './styles.css';
import { inject } from '@vercel/analytics';
import { renderATHCalculator, initATHCalculator } from './ath-calculator.js';
import { renderPACCalculator, initPACCalculator } from './pac-calculator.js';
import { renderWalletTool, initWalletTool } from './wallet-tool.js';
import { renderPolymarketTool, initPolymarketTool } from './polymarket-tool.js';
import degateLogo from '/degate-logo.png';
import officinaLogo from '/officina-logo.png';

// Initialize Vercel Analytics
inject();

const app = document.getElementById('app');

const DEGATE_LINK = 'https://app.degate.com/?utm_source=walletanalyzer?s=jack18';

// Set globals for tool page access (avoids circular imports)
window.__degateLogo = degateLogo;
window.__degateLink = DEGATE_LINK;

// Current active page
let currentPage = 'ath';
let sidebarOpen = false;

const NAV_ITEMS = [
  { id: 'ath',        emoji: '📈', label: 'ATH Calculator' },
  { id: 'pac',        emoji: '💰', label: 'PAC vs Singolo' },
  { id: 'wallet',     emoji: '🔍', label: 'Wallet Intel' },
  { id: 'polymarket', emoji: '🔮', label: 'Polymarket Ita' },
];

// Exported for use by tool pages
export { DEGATE_LINK, degateLogo };

function getPageContent() {
  switch (currentPage) {
    case 'ath': return renderATHCalculator();
    case 'pac': return renderPACCalculator();
    case 'wallet': return renderWalletTool();
    case 'polymarket': return renderPolymarketTool();
    default: return renderATHCalculator();
  }
}

function initPage() {
  switch (currentPage) {
    case 'ath': initATHCalculator(); break;
    case 'pac': initPACCalculator(); break;
    case 'wallet': initWalletTool(); break;
    case 'polymarket': initPolymarketTool(); break;
  }
}

function toggleSidebar(open) {
  sidebarOpen = typeof open === 'boolean' ? open : !sidebarOpen;
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (sidebar) sidebar.classList.toggle('open', sidebarOpen);
  if (backdrop) backdrop.classList.toggle('visible', sidebarOpen);
  document.body.style.overflow = sidebarOpen ? 'hidden' : '';
}

function render() {
  const navItemsHTML = NAV_ITEMS.map(item => `
    <button class="sidebar-nav-item ${currentPage === item.id ? 'active' : ''}" data-page="${item.id}">
      <span class="nav-item-emoji">${item.emoji}</span>
      <span class="nav-item-label">${item.label}</span>
    </button>
  `).join('');

  app.innerHTML = `
    <!-- Mobile hamburger -->
    <button class="mobile-toggle" id="mobile-toggle" aria-label="Menu">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>

    <!-- Sidebar backdrop (mobile) -->
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <a href="#" class="sidebar-logo" id="sidebar-logo" style="display: flex; align-items: center; gap: 12px; padding: 16px 20px; text-decoration: none;">
          <img src="${officinaLogo}" alt="Officina DeFi" style="height: 36px; width: 36px; border-radius: 50%; object-fit: cover;" />
          <span class="logo-text" style="font-size: 1.1rem; font-weight: 700; color: var(--text);">Officina DeFi</span>
        </a>
      </div>

      <nav class="sidebar-nav">
        ${navItemsHTML}
      </nav>

      <div class="sidebar-socials" style="display: flex; gap: 16px; justify-content: center; padding: 16px 20px; border-top: 1px solid var(--border);">
        <a href="https://t.me/officinadefi" target="_blank" rel="noopener" title="Telegram" style="font-size: 24px; text-decoration: none;">✈️</a>
        <a href="https://x.com/OfficinaDefi" target="_blank" rel="noopener" title="X (Twitter)" style="font-size: 24px; text-decoration: none;">🐦</a>
        <a href="https://www.instagram.com/officinadefi/" target="_blank" rel="noopener" title="Instagram" style="font-size: 24px; text-decoration: none;">📸</a>
        <a href="https://www.officinadefi.com/" target="_blank" rel="noopener" title="Website" style="font-size: 24px; text-decoration: none;">🌐</a>
      </div>

      <div class="sidebar-footer">
        <a href="${DEGATE_LINK}" target="_blank" rel="noopener" class="degate-cta-sidebar">
          <img src="${degateLogo}" alt="DeGate" class="degate-cta-logo" />
          <span class="degate-cta-text">
            <span class="degate-cta-label">Prova DeGate</span>
            <span class="degate-cta-sub">Wallet Web3 Multichain Selfcustody</span>
          </span>
        </a>
        <div class="sidebar-footer-text">
          <span class="footer-dot"></span>
          v1.0 — DeFi Toolkit
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content" id="page-content">
      ${getPageContent()}
    </main>
  `;

  initPage();

  // --- Event listeners ---

  // Navigation
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page !== currentPage) {
        if (currentPage === 'polymarket') {
          history.replaceState(null, '', window.location.pathname);
        }
        currentPage = page;
        toggleSidebar(false);
        render();
      } else {
        toggleSidebar(false);
      }
    });
  });

  // Logo click → home
  document.getElementById('sidebar-logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    currentPage = 'ath';
    toggleSidebar(false);
    render();
  });

  // Mobile toggle
  document.getElementById('mobile-toggle')?.addEventListener('click', () => {
    toggleSidebar();
  });

  // Backdrop click → close
  document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
    toggleSidebar(false);
  });
}

// Initial render
render();
