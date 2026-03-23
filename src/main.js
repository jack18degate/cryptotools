/**
 * Crypto DeFi Tools — Main Entry Point
 * Navigation and routing between tools
 */
import './styles.css';
import { renderATHCalculator, initATHCalculator } from './ath-calculator.js';
import { renderPACCalculator, initPACCalculator } from './pac-calculator.js';
import { renderWalletTool, initWalletTool } from './wallet-tool.js';
import { renderPolymarketTool, initPolymarketTool } from './polymarket-tool.js';

const app = document.getElementById('app');

// Current active page
let currentPage = 'ath';

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

function render() {
  app.innerHTML = `
    <nav class="navbar">
      <a href="#" class="navbar-brand" id="nav-brand">
        <span class="logo-icon">🚀</span>
        <span class="brand-text">Crypto DeFi Tools</span>
      </a>
      <div class="navbar-nav">
        <button class="nav-btn ${currentPage === 'ath' ? 'active' : ''}" data-page="ath">
          📈 ATH Calculator
        </button>
        <button class="nav-btn ${currentPage === 'pac' ? 'active' : ''}" data-page="pac">
          💰 PAC vs Inv. Singolo
        </button>
        <button class="nav-btn ${currentPage === 'wallet' ? 'active' : ''}" data-page="wallet">
          🔍 Wallet Intel
        </button>
        <button class="nav-btn ${currentPage === 'polymarket' ? 'active' : ''}" data-page="polymarket">
          🔮 Polymarket Ita
        </button>
      </div>
    </nav>
    <main id="page-content">
      ${getPageContent()}
    </main>
  `;

  initPage();

  // Navigation handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page !== currentPage) {
        // Clean up hash when leaving Polymarket
        if (currentPage === 'polymarket') {
          history.replaceState(null, '', window.location.pathname);
        }
        currentPage = page;
        render();
      }
    });
  });

  document.getElementById('nav-brand').addEventListener('click', (e) => {
    e.preventDefault();
    currentPage = 'ath';
    render();
  });
}

// Initial render
render();
