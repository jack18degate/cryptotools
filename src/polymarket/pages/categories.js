// ==============================
// Categories Page
// ==============================

import { listTags, listEventsByTag } from '../api.js';
import { formatCurrency, formatPercent, parseOutcomes, defaultImage, getPlaceholder } from '../utils.js';
import { navigate } from '../router.js';

const DEGATE_LINK = 'https://app.degate.com/?utm_source=walletanalyzer?s=jack18';

// Organize tags into logical groups
const TAG_GROUPS = {
  '🏛️ Politica & Governi': ['politics', 'election', 'congress', 'attorney', 'president', 'trump', 'biden', 'democrat', 'republican', 'senate', 'governor', 'supreme-court', 'u.s.', 'address'],
  '⚽ Sport': ['sports', 'nba', 'nfl', 'football', 'soccer', 'tennis', 'golf', 'ufc', 'mma', 'formula', 'f1', 'olympics', 'medal', 'mlb', 'nhl', 'cricket', 'wnba', 'march-madness', 'college', 'playoffs', 'world-cup', 'champions', 'serie', 'madrid', 'wildcat', 'aggie', 'valorant', 'lol'],
  '💰 Crypto & Finanza': ['crypto', 'bitcoin', 'ethereum', 'altcoin', 'defi', 'fartcoin', 'commodity', 'fed', 'interest-rate', 'debt', 'recession', 'inflation', 'initial-jobless', 'degate'],
  '🌍 Mondo & Geopolitica': ['world', 'global', 'nato', 'war', 'ukraine', 'russia', 'china', 'europe', 'sweeden', 'keir', 'davos'],
  '🎬 Cultura & Intrattenimento': ['entertainment', 'culture', 'music', 'movie', 'tv', 'oscar', 'grammy', 'best-of', 'daylight', 'odie', 'paradex', 'costello', 'pregnant', 'connor'],
  '💻 Tech & AI': ['tech', 'technology', 'ai', 'artificial', 'openai', 'google', 'apple', 'space', 'science'],
  '🏥 Salute': ['health', 'medical', 'vaccine', 'covid', 'pandemic'],
  '🏷️ Altro': [] // catch-all
};

function categorizeTag(tag) {
  const slug = (tag.slug || '').toLowerCase();
  const label = (tag.label || '').toLowerCase();

  for (const [group, keywords] of Object.entries(TAG_GROUPS)) {
    if (group === '🏷️ Altro') continue;
    if (keywords.some(kw => slug.includes(kw) || label.includes(kw))) {
      return group;
    }
  }
  return '🏷️ Altro';
}

export async function renderCategories(container) {
  container.innerHTML = `
    <div class="categories-page">
      <button class="back-btn" id="back-btn">← Torna alla Dashboard</button>

      <section class="hero" style="padding:24px 0">
        <h1 style="font-size:28px">🏷️ Esplora per Categoria</h1>
        <p style="font-size:14px;color:var(--text-secondary);max-width:500px;margin:8px auto 0">Sfoglia i mercati predittivi per argomento.</p>
      </section>

      <div id="tags-container"></div>

      <div id="category-results" style="margin-top:32px"></div>

      <!-- Sponsor -->
      <section class="sponsor-banner" style="margin-top:32px">
        <div class="sponsor-badge">⭐ Partner Consigliato</div>
        <h3>Fai Trading con DeGate</h3>
        <p>Exchange decentralizzato, zero gas fees, la sicurezza di Ethereum.</p>
        <a href="${DEGATE_LINK}" target="_blank" rel="noopener" class="sponsor-cta">
          Scopri DeGate →
        </a>
      </section>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => navigate('/'));

  try {
    const tags = await listTags();
    const tagsContainer = document.getElementById('tags-container');
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      tagsContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">🏷️</div><p>Nessuna categoria disponibile</p></div>';
      return;
    }

    // Group tags by category
    const grouped = {};
    for (const group of Object.keys(TAG_GROUPS)) {
      grouped[group] = [];
    }

    for (const tag of tags) {
      const group = categorizeTag(tag);
      grouped[group].push(tag);
    }

    // Sort each group alphabetically
    for (const group of Object.keys(grouped)) {
      grouped[group].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    }

    // Render grouped tags
    let html = '';
    for (const [groupName, groupTags] of Object.entries(grouped)) {
      if (groupTags.length === 0) continue;
      html += `
        <div class="tag-group">
          <h3 class="tag-group-title">${groupName}</h3>
          <div class="tags-grid">
            ${groupTags.map(tag => `
              <button class="tag-pill" data-tag-slug="${tag.slug}" data-tag-label="${escapeAttr(tag.label)}">
                ${escapeHtml(tag.label)}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    tagsContainer.innerHTML = html;

    // Bind tag clicks
    tagsContainer.querySelectorAll('.tag-pill').forEach(pill => {
      pill.addEventListener('click', async () => {
        tagsContainer.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const slug = pill.dataset.tagSlug;
        const label = pill.dataset.tagLabel;
        await loadCategoryResults(slug, label);
      });
    });

  } catch (err) {
    console.error('Error loading tags:', err);
  }
}

async function loadCategoryResults(tagSlug, tagLabel) {
  const resultsDiv = document.getElementById('category-results');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `
    <div class="section-header">
      <h2>🏷️ ${escapeHtml(tagLabel)}</h2>
    </div>
    <div class="markets-grid">
      ${Array(4).fill('<div class="skeleton skeleton-card" style="height:200px;border-radius:16px"></div>').join('')}
    </div>
  `;

  // Scroll to results
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const events = await listEventsByTag(tagSlug);
    if (!events || events.length === 0) {
      resultsDiv.innerHTML = `
        <div class="section-header"><h2>🏷️ ${escapeHtml(tagLabel)}</h2></div>
        <div class="empty-state"><div class="empty-icon">📭</div><p>Nessun mercato attivo in questa categoria</p></div>
      `;
      return;
    }

    resultsDiv.innerHTML = `
      <div class="section-header">
        <h2>🏷️ ${escapeHtml(tagLabel)}</h2>
        <span style="font-size:13px;color:var(--text-muted)">${events.length} eventi</span>
      </div>
      <div class="markets-grid">
        ${events.map((event, i) => renderCategoryCard(event, i)).join('')}
      </div>
    `;

    resultsDiv.querySelectorAll('.market-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.marketId;
        if (id) navigate(`/market/${id}`);
      });
    });

  } catch (err) {
    resultsDiv.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Errore nel caricamento</p></div>';
  }
}

function renderCategoryCard(event, index) {
  const market = event.markets?.[0];
  const outcomes = market ? parseOutcomes(market) : [];
  const yesPrice = outcomes.find(o => o.name === 'Yes')?.price || outcomes[0]?.price || 0;
  const noPrice = outcomes.find(o => o.name === 'No')?.price || outcomes[1]?.price || 0;
  const title = event.title || market?.question || 'Mercato senza titolo';
  const image = defaultImage(event.image || market?.image);
  const volume = event.volume || 0;
  const marketId = market?.id || event.id;

  const stagger = `stagger-${(index % 6) + 1}`;

  return `
    <div class="market-card fade-in ${stagger}" data-market-id="${marketId}">
      <div class="market-card-header">
        <img class="market-card-image" src="${image}" alt="" loading="lazy" onerror="this.src='${getPlaceholder()}'"/>
        <div class="market-card-title">${escapeHtml(title)}</div>
      </div>
      <div class="outcomes-container">
        ${yesPrice > 0 ? `
        <div class="outcome-row">
          <span class="outcome-label">Sì</span>
          <div class="outcome-bar-bg">
            <div class="outcome-bar-fill yes" style="width:${Math.max(yesPrice * 100, 5)}%">
              <span class="outcome-price">${formatPercent(yesPrice, 0)}</span>
            </div>
          </div>
        </div>` : ''}
        ${noPrice > 0 ? `
        <div class="outcome-row">
          <span class="outcome-label">No</span>
          <div class="outcome-bar-bg">
            <div class="outcome-bar-fill no" style="width:${Math.max(noPrice * 100, 5)}%">
              <span class="outcome-price">${formatPercent(noPrice, 0)}</span>
            </div>
          </div>
        </div>` : ''}
      </div>
      <div class="market-card-stats">
        <div class="market-stat">
          <span class="label">Volume</span>
          <span class="value">${formatCurrency(volume)}</span>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
