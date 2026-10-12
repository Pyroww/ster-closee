import { CONFIG } from './config.js';
import { categories, products as demoProducts, sizes } from './products.js';
import { getSupabase, isConfigured } from './supabase.js';
import { toCatalogProduct } from './product-utils.js';

let products = demoProducts;

const $ = (selector) => document.querySelector(selector);
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (value) => BRL.format(value);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem('ster-closee-favoritos') || localStorage.getItem('mimo-club-favoritos') || '[]');
    return new Set(Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : []);
  } catch { return new Set(); }
}
const state = {
  category: 'todos', search: '', size: '', color: '', pattern: '', maxPrice: 200,
  availableOnly: true, sort: 'recentes', favoritesOnly: false, favorites: loadFavorites(),
};
let toastTimeout;
const grid = $('#products-grid');
const dialog = $('#product-dialog');
// A capa mantém o grafismo editorial quando a fotografia externa não carrega.
const heroPhoto = $('.hero-editorial-photograph img');
if (heroPhoto) {
  const hideUnavailablePhoto = () => { heroPhoto.style.display = 'none'; };
  heroPhoto.addEventListener('error', hideUnavailablePhoto);
  if (heroPhoto.complete && heroPhoto.naturalWidth === 0) hideUnavailablePhoto();
}


function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 4200);
}
function setImageFallback(img) {
  if (img.dataset.fallback && !img.dataset.isFallback) {
    img.dataset.isFallback = 'true';
    img.src = img.dataset.fallback;
  }
}
// A página continua funcional com ilustrações locais se uma foto remota falhar.
document.addEventListener('error', (e) => {
  if (e.target instanceof HTMLImageElement) setImageFallback(e.target);
}, true);

function renderCategoryChips() {
  $('#category-chips').innerHTML = categories.map(category => `
    <button class="category-chip" type="button" data-category="${escapeHtml(category.id)}" aria-pressed="${state.category === category.id}">
      <span aria-hidden="true">${category.icon}</span>${escapeHtml(category.name)}
    </button>`).join('');
}
function renderSizeChips() {
  $('#size-chips').innerHTML = sizes.map(size => `
    <button class="size-chip" type="button" data-size="${escapeHtml(size)}" aria-pressed="${state.size === size}">${escapeHtml(size)}</button>`).join('');
}
function filteredProducts() {
  const result = products.filter(p => {
    if (state.category !== 'todos' && p.category !== state.category) return false;
    if (state.size && p.size !== state.size) return false;
    if (state.color && p.color !== state.color) return false;
    if (state.pattern && (p.patterned ? 'estampado' : 'liso') !== state.pattern) return false;
    if (p.price > state.maxPrice) return false;
    if (state.availableOnly && !p.available) return false;
    if (state.favoritesOnly && !state.favorites.has(p.id)) return false;
    const text = normalize([p.name, p.categoryLabel, p.description, p.color, p.sku].join(' '));
    return !state.search || text.includes(normalize(state.search));
  });
  result.sort((a, b) => {
    if (state.sort === 'menor') return a.price - b.price;
    if (state.sort === 'maior') return b.price - a.price;
    if (state.sort === 'nome') return a.name.localeCompare(b.name, 'pt-BR');
    return b.publishedAt.localeCompare(a.publishedAt);
  });
  return result;
}
function cardMarkup(p) {
  const first = p.images[0] || { src: '/assets/favicon.svg', fallback: '/assets/favicon.svg', alt: p.name };
  const liked = state.favorites.has(p.id);
  return `
    <article class="product-card ${p.available ? '' : 'product-sold'}">
      <div class="product-photo-wrap">
        <button class="product-image-button" type="button" data-action="details" data-id="${escapeHtml(p.id)}" aria-label="Ver detalhes de ${escapeHtml(p.name)}">
          <img class="product-photo" src="${escapeHtml(first.src)}" data-fallback="${escapeHtml(first.fallback)}" alt="${escapeHtml(first.alt)}" loading="lazy" decoding="async" />
        </button>
        <div class="photo-tint"></div>
        ${!p.available ? `<span class="product-badge sold-tag">${p.availability === 'reserved' ? 'reservada' : 'vendida'}</span>` : p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ''}
        <button class="favorite-toggle" type="button" data-action="favorite" data-id="${escapeHtml(p.id)}" aria-label="${liked ? 'Remover' : 'Adicionar'} ${escapeHtml(p.name)} ${liked ? 'dos' : 'aos'} favoritos" aria-pressed="${liked}">${icon('heart')}</button>
      </div>
      <div class="product-info">
        <div class="product-category">${escapeHtml(p.categoryLabel)} · ${escapeHtml(p.sku)}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="product-meta"><span>Tam. ${escapeHtml(p.size)}</span><span>${escapeHtml(p.color)}</span><span>${p.patterned ? 'Estampado' : 'Liso'}</span></div>
        <div class="product-price-row"><strong class="product-price">${money(p.price)}</strong><span class="product-unique">peça única</span></div>
        <div class="product-actions">
          <button class="product-details-button" type="button" data-action="details" data-id="${escapeHtml(p.id)}" aria-label="Ver detalhes de ${escapeHtml(p.name)}" title="Ver detalhes">${icon('search')}</button>
          <button class="product-buy" type="button" data-action="buy" data-id="${escapeHtml(p.id)}" ${!p.available ? 'disabled' : ''}>${p.available ? `Quero essa peça ${icon('arrow')}` : p.availability === 'reserved' ? 'Peça reservada' : 'Peça vendida'}</button>
        </div>
      </div>
    </article>`;
}
function renderProducts() {
  const list = filteredProducts();
  grid.innerHTML = list.map(cardMarkup).join('');
  $('#empty-state').hidden = list.length !== 0;
  $('#result-count').innerHTML = `<strong>${list.length}</strong> ${list.length === 1 ? 'peça encontrada' : 'peças encontradas'}${state.favoritesOnly ? ' · seus favoritos' : ''}`;
  $('#favorite-count').textContent = state.favorites.size;
  $('#favorite-count').hidden = state.favorites.size === 0;
  $('#favorites-button').setAttribute('aria-pressed', String(state.favoritesOnly));
}
function renderAll() { renderCategoryChips(); renderSizeChips(); renderProducts(); }
function syncInputs() {
  $('#search-input').value = state.search;
  $('#color-select').value = state.color;
  $('#pattern-select').value = state.pattern;
  $('#price-range').value = state.maxPrice;
  $('#price-label').textContent = money(state.maxPrice);
  $('#available-only').checked = state.availableOnly;
  $('#sort-select').value = state.sort;
}
function clearFilters() {
  Object.assign(state, { category: 'todos', search: '', size: '', color: '', pattern: '', maxPrice: 200, availableOnly: true, sort: 'recentes', favoritesOnly: false });
  syncInputs(); renderAll();
}
function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  try { localStorage.setItem('ster-closee-favoritos', JSON.stringify([...state.favorites])); }
  catch { showToast('Não foi possível salvar favoritos neste navegador.'); }
  renderProducts();
}
function productLink(p) {
  // Link compartilhável após publicar em domínio HTTP(S); abre a peça no modal.
  const url = new URL(window.location.href);
  url.searchParams.set('peca', p.id);
  url.hash = 'catalogo';
  return url.toString();
}
function whatsappNumber() {
  return String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
}
function openWhatsApp(message) {
  const phone = whatsappNumber();
  if (phone.length < 12 || phone.length > 15) {
    showToast('⚙ Configure seu WhatsApp no arquivo js/config.js para habilitar o contato.');
    return;
  }
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  // Abre WhatsApp/app em celulares e WhatsApp Web em computadores.
  window.open(url, '_blank', 'noopener,noreferrer');
}
function buyProduct(p) {
  if (!p.available) { showToast('Essa peça não está disponível no momento.'); return; }
  const imageLink = new URL(p.images[0]?.src || '/assets/favicon.svg', window.location.href).href;
  const message = `${CONFIG.whatsappGreeting}\n\n🛍️ *${p.name}*\n🔖 Código: ${p.sku}\n💰 Valor: ${money(p.price)}\n📏 Tamanho: ${p.size}\n🎨 Cor: ${p.color}\n✨ Estampa: ${p.patterned ? 'Estampado' : 'Liso'}\n🖼️ Foto da peça: ${imageLink}\n🔗 Ver no catálogo: ${productLink(p)}\n\nPodemos confirmar a disponibilidade e combinar entrega e pagamento?`;
  openWhatsApp(message);
}
function openDetails(id, updateUrl = true) {
  const p = products.find(product => product.id === id);
  if (!p) return;
  const img = p.images[0] || { src: '/assets/favicon.svg', fallback: '/assets/favicon.svg', alt: p.name };
  $('#product-dialog-content').innerHTML = `
    <div class="modal-content">
      <button class="modal-close" type="button" data-action="close" aria-label="Fechar detalhes">${icon('x')}</button>
      <div class="modal-gallery">
        <div class="modal-gallery-main"><img src="${escapeHtml(img.src)}" data-fallback="${escapeHtml(img.fallback)}" alt="${escapeHtml(img.alt)}" /></div>
        ${p.images.length > 1 ? `<div class="modal-thumbs">${p.images.map((item, i) => `<button type="button" class="modal-thumb" data-action="photo" data-index="${i}" aria-label="Foto ${i+1}"><img src="${escapeHtml(item.src)}" data-fallback="${escapeHtml(item.fallback)}" alt="" /></button>`).join('')}</div>` : ''}
      </div>
      <div class="modal-body">
        <span class="modal-category">${escapeHtml(p.categoryLabel)} · ${escapeHtml(p.sku)}</span>
        <h2 id="modal-title">${escapeHtml(p.name)}</h2>
        <div class="modal-price">${money(p.price)}</div>
        <span class="modal-status ${p.available ? '' : 'sold'}">${p.available ? '✦ Peça disponível' : p.availability === 'reserved' ? 'Peça reservada' : '♡ Peça vendida'}</span>
        <p class="modal-description">${escapeHtml(p.description)}</p>
        <div class="modal-specs">
          <div><span>Tamanho</span><strong>${escapeHtml(p.size)}</strong></div>
          <div><span>Cor</span><strong>${escapeHtml(p.color)}</strong></div>
          <div><span>Estilo</span><strong>${p.patterned ? 'Estampado' : 'Liso'}</strong></div>
          <div><span>Estado</span><strong>${escapeHtml(p.condition)}</strong></div>
          <div><span>Material</span><strong>${escapeHtml(p.material)}</strong></div>
          <div><span>Código</span><strong>${escapeHtml(p.sku)}</strong></div>
        </div>
        <button class="modal-buy" type="button" data-action="buy" data-id="${escapeHtml(p.id)}" ${p.available ? '' : 'disabled'}>${p.available ? `Quero essa peça no WhatsApp ${icon('arrow')}` : p.availability === 'reserved' ? 'Essa peça está reservada' : 'Essa peça foi vendida'}</button>
        <div class="modal-sharing"><button type="button" data-action="share" data-id="${escapeHtml(p.id)}">↗ copiar link da peça</button></div>
        <p class="modal-info-note">O pagamento e a entrega são combinados diretamente com o brechó pelo WhatsApp. Não há pagamento pelo site.</p>
      </div>
    </div>`;
  dialog.dataset.productId = p.id;
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('peca', p.id);
    history.replaceState(null, '', url);
  }
}
function closeDetails() { if (dialog.open) dialog.close(); }
function removeProductQuery() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('peca')) {
    url.searchParams.delete('peca');
    history.replaceState(null, '', url);
  }
}
async function copyProductLink(p) {
  try {
    await navigator.clipboard.writeText(productLink(p));
    showToast('Link da peça copiado! ♡');
  } catch { showToast('Não foi possível copiar. Abra o site em localhost ou HTTPS.'); }
}
function toggleFilters(open) {
  $('#filters-panel').classList.toggle('open', open);
  $('#filter-backdrop').hidden = !open;
  document.body.classList.toggle('filter-open', open);
}

// Eventos dos produtos são delegados: a lista pode ser recriada após qualquer filtro.
grid.addEventListener('click', (e) => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const p = products.find(item => item.id === button.dataset.id);
  if (!p) return;
  if (button.dataset.action === 'favorite') toggleFavorite(p.id);
  if (button.dataset.action === 'details') openDetails(p.id);
  if (button.dataset.action === 'buy') buyProduct(p);
});
dialog.addEventListener('click', (e) => {
  const button = e.target.closest('[data-action]');
  if (button) {
    if (button.dataset.action === 'close') closeDetails();
    const p = products.find(item => item.id === button.dataset.id);
    if (p && button.dataset.action === 'buy') buyProduct(p);
    if (p && button.dataset.action === 'share') copyProductLink(p);
    if (button.dataset.action === 'photo') {
      const p = products.find(item => item.id === dialog.dataset.productId);
      const photo = p?.images[Number(button.dataset.index)];
      if (photo) {
        const current = dialog.querySelector('.modal-gallery-main img');
        current.src = photo.src;
        current.dataset.fallback = photo.fallback;
        delete current.dataset.isFallback;
        current.alt = photo.alt;
      }
    }
  } else if (e.target === dialog) closeDetails();
});
dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); removeProductQuery(); });
$('#category-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-category]');
  if (!btn) return;
  state.category = btn.dataset.category;
  renderCategoryChips(); renderProducts();
});
$('#size-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-size]');
  if (!btn) return;
  state.size = state.size === btn.dataset.size ? '' : btn.dataset.size;
  renderSizeChips(); renderProducts();
});
$('#search-input').addEventListener('input', e => { state.search = e.target.value.trim(); renderProducts(); });
$('#color-select').addEventListener('change', e => { state.color = e.target.value; renderProducts(); });
$('#pattern-select').addEventListener('change', e => { state.pattern = e.target.value; renderProducts(); });
$('#price-range').addEventListener('input', e => { state.maxPrice = Number(e.target.value); $('#price-label').textContent = money(state.maxPrice); renderProducts(); });
$('#available-only').addEventListener('change', e => { state.availableOnly = e.target.checked; renderProducts(); });
$('#sort-select').addEventListener('change', e => { state.sort = e.target.value; renderProducts(); });
$('#clear-filters').addEventListener('click', clearFilters);
$('#empty-reset').addEventListener('click', clearFilters);
$('#favorites-button').addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  renderProducts();
  $('#catalogo').scrollIntoView({ behavior: 'smooth' });
});
$('#filters-mobile-trigger').addEventListener('click', () => toggleFilters(true));
$('#close-filters').addEventListener('click', () => toggleFilters(false));
$('#filter-backdrop').addEventListener('click', () => toggleFilters(false));
$('#menu-toggle').addEventListener('click', () => {
  const open = $('#main-nav').classList.toggle('open');
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
});
$('#main-nav').addEventListener('click', e => {
  if (e.target.closest('a')) {
    $('#main-nav').classList.remove('open');
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
  }
});
$('#footer-whatsapp').addEventListener('click', () => openWhatsApp(`Oi! 💗 Encontrei o ${CONFIG.storeName} e gostaria de conhecer os garimpos e saber mais sobre as peças.`));
document.addEventListener('keydown', e => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !dialog.open) {
    e.preventDefault(); $('#search-input').focus();
  }
  if (e.key === 'Escape') toggleFilters(false);
});

$('#year').textContent = new Date().getFullYear();
syncInputs();
renderAll();

const catalogStatus = $('#catalog-status');
const queryProduct = new URL(window.location.href).searchParams.get('peca');
async function loadCatalog() {
  if (!isConfigured) {
    catalogStatus.textContent = 'Vitrine de demonstração · conecte o Supabase para exibir as peças reais.';
    if (queryProduct) openDetails(queryProduct, false);
    return;
  }
  catalogStatus.textContent = 'Carregando os garimpos publicados...';
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('products').select('*')
      .eq('is_published', true).order('published_at', { ascending: false }).limit(500);
    if (error) throw error;
    products = (data || []).map(row => toCatalogProduct(row, supabase));
    const max = Math.max(200, Math.ceil(Math.max(0, ...products.map(p => p.price)) / 50) * 50);
    $('#price-range').max = max;
    $('.range-captions span:last-child').textContent = money(max);
    if (state.maxPrice === 200) state.maxPrice = max;
    state.favorites = new Set([...state.favorites].filter(id => products.some(p => p.id === id)));
    syncInputs();
    renderAll();
    catalogStatus.textContent = products.length ? 'Catálogo atualizado com os garimpos publicados.' : 'Ainda não há peças publicadas. Novidades em breve.';
    if (queryProduct) {
      if (products.some(p => p.id === queryProduct)) openDetails(queryProduct, false);
      else showToast('Essa peça não está mais no catálogo.');
    }
  } catch (error) {
    products = [];
    renderProducts();
    catalogStatus.innerHTML = `Não foi possível carregar o catálogo. Verifique o Supabase e <button type="button" id="retry-catalog">tente novamente</button>.`;
    $('#retry-catalog').addEventListener('click', loadCatalog, { once: true });
    console.error('Falha ao carregar catálogo:', error);
  }
}
loadCatalog();
