// ==============================
// Polymarket Insights Italia — Embedded
// ==============================

import './polymarket/polymarket.css';
import { renderDashboard } from './polymarket/pages/dashboard.js';

let initialized = false;

export function renderPolymarketTool() {
  return `
    <div class="pm-scope" id="pm-app">
      <div id="pm-dashboard-view">
        <div class="pm-loading" style="padding: 100px; text-align: center;">
          <div class="spinner"></div>
          <p style="margin-top:16px; color:var(--text-secondary);">Caricamento Polymarket Insights...</p>
        </div>
      </div>
      <div id="pm-detail-view" style="display:none;"></div>
      
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
    </div>
  `;
}

export function initPolymarketTool() {
  const pmApp = document.getElementById('pm-app');
  if (!pmApp) return;

  if (!initialized) {
    const dashboardContainer = document.getElementById('pm-dashboard-view');
    const detailContainer = document.getElementById('pm-detail-view');

    // Kick off rendering
    renderDashboard(dashboardContainer, detailContainer);
    
    initialized = true;
  }
}

export function destroyPolymarketTool() {
  // When leaving the tool completely
  initialized = false;
}
