/**
 * Crypto DeFi Tools — Main Entry Point
 * Navigation and routing between tools
 */
import './styles.css';
import { renderATHCalculator, initATHCalculator } from './ath-calculator.js';
import { renderPACCalculator, initPACCalculator } from './pac-calculator.js';

const app = document.getElementById('app');

// Current active page
let currentPage = 'ath';

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
      </div>
    </nav>
    <main id="page-content">
      ${currentPage === 'ath' ? renderATHCalculator() : renderPACCalculator()}
    </main>
  `;

  // Initialize the active page
  if (currentPage === 'ath') {
    initATHCalculator();
  } else {
    initPACCalculator();
  }

  // Navigation handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page !== currentPage) {
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
