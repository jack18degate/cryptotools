// ==============================
// Header Component
// ==============================

export function renderHeader() {
  return `
    <nav class="navbar">
      <div class="navbar-inner">
        <a class="navbar-brand" data-nav="/">
          <span class="logo-icon">📊</span>
          <span class="logo-text">Polymarket Insights</span>
          <span class="logo-badge">🇮🇹 ITALIA</span>
        </a>

        <ul class="navbar-nav" id="nav-links">
          <li><a data-nav="/" class="active">🏠 Home</a></li>
          <li><a data-nav="/categories">🏷️ Categorie</a></li>
          <li><a data-nav="/search/trending">🔍 Cerca Evento</a></li>
        </ul>

        <div class="navbar-search">
          <span class="search-icon">🔎</span>
          <input type="text" id="nav-search" placeholder="Cerca mercati..." autocomplete="off" />
        </div>

        <button class="navbar-mobile-toggle" id="mobile-toggle">☰</button>
      </div>
    </nav>
  `;
}
