import { isConfigured, getSupabase, imageUrl } from '../js/supabase.js';
import { categories, sizes, products as sampleProducts } from '../js/products.js';
import { escapeHtml, money } from '../js/product-utils.js';

const $ = selector => document.querySelector(selector);
const colorOptions = ['Rosa', 'Azul', 'Verde', 'Branco', 'Preto', 'Bege', 'Vermelho', 'Amarelo', 'Colorido', 'Lilás', 'Marrom', 'Cinza', 'Laranja', 'Dourado', 'Prata'];
let db, products = [], current = null, photos = [], busy = false, activeUser = null, toastTimer, previewMode = false;
const categoriesMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
const form = $('#product-form');
function makeUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function show(element) { element.hidden = false; }
function hide(element) { element.hidden = true; }
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4200);
}
function errorText(err) { return err?.message || 'Ocorreu um problema. Tente novamente.'; }
function setBusy(value, message = '') {
  busy = value;
  $('#save-product').disabled = value;
  $('#save-draft').disabled = value;
  $('#delete-product').disabled = value;
  $('#close-editor').disabled = value;
  $('#editor-feedback').classList.remove('error');
  $('#editor-feedback').textContent = message;
}
function editorError(message) {
  $('#editor-feedback').classList.add('error');
  $('#editor-feedback').textContent = message;
}
function statusLabels(p) {
  const list = [p.is_published ? ['published', 'Publicada'] : ['draft', 'Rascunho']];
  if (p.is_published) list.push([p.availability, { available: 'Disponível', reserved: 'Reservada', sold: 'Vendida' }[p.availability]]);
  return list.map(([cls, label]) => `<span class="status-pill ${cls}">${label}</span>`).join('');
}

async function checkAdmin(user) {
  const { data, error } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
async function enterDashboard(user) {
  if (!await checkAdmin(user)) {
    await db.auth.signOut();
    throw new Error('Sua conta existe, mas não foi autorizada como administradora. Consulte o README para incluir seu ID em admin_users.');
  }
  activeUser = user;
  hide($('#login-screen')); hide($('#setup-screen')); show($('#app-screen'));
  $('#logged-email').textContent = user.email || '';
  await loadProducts();
}
async function start() {
  if (!isConfigured) { show($('#setup-screen')); return; }
  show($('#login-screen'));
  try {
    db = await getSupabase();
    const { data: { user }, error } = await db.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') console.warn('Sessão:', error.message);
    if (user) await enterDashboard(user);
  } catch (err) {
    $('#login-error').textContent = 'Não foi possível iniciar o painel: ' + errorText(err);
    show($('#login-error'));
  }
}
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  hide($('#login-error'));
  const btn = $('#login-submit');
  btn.disabled = true; btn.textContent = 'Validando acesso...';
  try {
    if (!db) db = await getSupabase();
    const { data, error } = await db.auth.signInWithPassword({ email: $('#login-email').value.trim(), password: $('#login-password').value });
    if (error) throw error;
    await enterDashboard(data.user);
    $('#login-password').value = '';
  } catch (err) {
    $('#login-error').textContent = errorText(err);
    show($('#login-error'));
  } finally { btn.disabled = false; btn.textContent = 'Entrar no studio ↗'; }
});
async function logout() {
  if (busy) return;
  if (previewMode) { previewMode = false; products = []; hide($('#app-screen')); show($('#setup-screen')); return; }
  try { await db.auth.signOut(); } catch (error) { toast(errorText(error)); return; }
  activeUser = null; products = [];
  hide($('#app-screen')); show($('#login-screen'));
}
$('#logout-desktop').addEventListener('click', logout);
$('#logout-mobile').addEventListener('click', logout);

async function loadProducts() {
  if (previewMode) { updateStats(); renderList(); $('#inventory-message').textContent = 'MODO DEMONSTRAÇÃO · Nada será salvo ou publicado. Configure o Supabase para começar.'; return; }
  $('#inventory-message').textContent = 'Carregando inventário...';
  try {
    const { data, error } = await db.from('products').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    products = data || [];
    updateStats(); renderList();
    $('#inventory-message').textContent = `${products.length} ${products.length === 1 ? 'peça cadastrada' : 'peças cadastradas'} no inventário`;
  } catch (err) {
    $('#inventory-message').textContent = 'Erro ao buscar peças: ' + errorText(err);
    toast('Não foi possível carregar o inventário.');
  }
}
function updateStats() {
  $('#stat-total').textContent = products.length;
  $('#stat-published').textContent = products.filter(p => p.is_published).length;
  $('#stat-available').textContent = products.filter(p => p.is_published && p.availability === 'available').length;
  $('#stat-sold').textContent = products.filter(p => p.availability === 'sold').length;
}
function renderList() {
  const search = $('#inventory-search').value.toLocaleLowerCase('pt-BR').trim();
  const filter = $('#inventory-filter').value;
  const rows = products.filter(p => {
    if (filter === 'published' && !p.is_published) return false;
    if (filter === 'draft' && p.is_published) return false;
    if (['available', 'reserved', 'sold'].includes(filter) && p.availability !== filter) return false;
    return !search || `${p.name} ${p.sku} ${categoriesMap[p.category] || ''}`.toLocaleLowerCase('pt-BR').includes(search);
  });
  if (!rows.length) {
    $('#inventory-list').innerHTML = `<div class="empty-list"><h3>Seu closet começa aqui.</h3><p>${products.length ? 'Nenhuma peça encontrada com esses filtros.' : 'Cadastre a primeira peça e publique no catálogo das clientes.'}</p></div>`;
    return;
  }
  $('#inventory-list').innerHTML = rows.map(p => {
    const img = previewMode ? (p.images?.[0]?.src || '/assets/favicon.svg') : (p.images?.[0]?.path ? imageUrl(db, p.images[0].path) : '/assets/favicon.svg');
    const fallback = previewMode ? (p.images?.[0]?.fallback || '/assets/favicon.svg') : '/assets/favicon.svg';
    return `<article class="inventory-row">
      <img class="inventory-thumb" src="${escapeHtml(img)}" data-fallback="${escapeHtml(fallback)}" alt="${escapeHtml(p.name)}" loading="lazy" />
      <div class="inventory-detail"><h3 class="inventory-title">${escapeHtml(p.name)}</h3><p class="inventory-meta">${escapeHtml(p.sku)} · ${escapeHtml(categoriesMap[p.category] || p.category)} · Tam. ${escapeHtml(p.size)}</p><div class="inventory-badges">${statusLabels(p)}</div></div>
      <strong class="inventory-price">${money(p.price)}</strong>
      <div class="row-actions"><button type="button" data-action="edit" data-id="${p.id}">Editar ↗</button><button type="button" data-action="status" data-id="${p.id}">${p.availability === 'sold' ? 'Disponibilizar' : 'Marcar vendida'}</button>${p.is_published ? `<button type="button" data-action="visit" data-id="${p.id}">Ver na loja ↗</button>` : ''}</div>
    </article>`;
  }).join('');
}
// A imagem de reserva mantém a prévia utilizável sem acesso ao servidor das fotos.
document.addEventListener('error', event => {
  const img = event.target;
  if (img instanceof HTMLImageElement && img.classList.contains('inventory-thumb') && !img.dataset.failed) {
    img.dataset.failed = 'yes';
    img.src = img.dataset.fallback || '/assets/favicon.svg';
  }
}, true);
$('#inventory-search').addEventListener('input', renderList);
$('#inventory-filter').addEventListener('change', renderList);
$('#refresh-list').addEventListener('click', loadProducts);
$('#inventory-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || busy) return;
  const p = products.find(item => item.id === button.dataset.id);
  if (!p) return;
  if (button.dataset.action === 'edit') openEditor(p);
  if (button.dataset.action === 'status' && previewMode) { toast('Prévia visual: conecte o Supabase para alterar as peças.'); return; }
  if (button.dataset.action === 'visit') window.open(`/?peca=${encodeURIComponent(p.id)}#catalogo`, '_blank', 'noopener,noreferrer');
  if (button.dataset.action === 'status') {
    const next = p.availability === 'sold' ? 'available' : 'sold';
    const prompt = next === 'sold' ? `Marcar "${p.name}" como vendida?` : `Disponibilizar novamente "${p.name}"?`;
    if (!window.confirm(prompt)) return;
    button.disabled = true;
    try {
      const { error } = await db.from('products').update({ availability: next }).eq('id', p.id);
      if (error) throw error;
      toast(next === 'sold' ? 'Peça marcada como vendida.' : 'Peça disponível novamente.');
      await loadProducts();
    } catch (error) { toast(errorText(error)); button.disabled = false; }
  }
});

function setupSelects() {
  $('#field-category').innerHTML = '<option value="">Escolha uma categoria</option>' + categories.filter(c => c.id !== 'todos').map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  $('#field-size').innerHTML = '<option value="">Escolha o tamanho</option>' + sizes.map(size => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join('');
  $('#field-color').innerHTML = '<option value="">Escolha a cor</option>' + colorOptions.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}
function clearLocalPhotos() {
  for (const photo of photos) if (photo.preview && photo.file) URL.revokeObjectURL(photo.preview);
  photos = [];
}
function openEditor(p = null) {
  current = p;
  clearLocalPhotos();
  form.reset();
  $('#editor-feedback').textContent = '';
  $('#editor-feedback').classList.remove('error');
  $('#editor-title').textContent = p ? 'Editar garimpo' : 'Cadastrar peça';
  $('#delete-product').hidden = !p;
  if (p) {
    for (const [key, value] of Object.entries({
      name: p.name, description: p.description, category: p.category, price: p.price,
      size: p.size, color: p.color, patterned: String(p.patterned), condition: p.condition,
      material: p.material || '', badge: p.badge || '', availability: p.availability,
      visibility: p.is_published ? 'published' : 'draft',
    })) {
      const field = form.elements.namedItem(key);
      if (field) field.value = value ?? '';
    }
    photos = (p.images || []).map(item => ({ path: item.path || 'preview', alt: item.alt || '', preview: previewMode ? item.src : imageUrl(db, item.path) }));
  } else {
    $('#field-visibility').value = 'published';
    $('#field-availability').value = 'available';
  }
  renderPhotos(); syncPublishButton();
  show($('#editor-backdrop')); show($('#editor'));
  document.body.style.overflow = 'hidden';
  $('.editor-content').scrollTop = 0;
  setTimeout(() => $('#field-name').focus(), 0);
}
function closeEditor() {
  if (busy) return;
  clearLocalPhotos();
  current = null;
  hide($('#editor')); hide($('#editor-backdrop'));
  document.body.style.overflow = '';
}
$('#new-product').addEventListener('click', () => openEditor());
$('#close-editor').addEventListener('click', closeEditor);
$('#editor-backdrop').addEventListener('click', closeEditor);
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#editor').hidden) closeEditor(); });
function renderPhotos() {
  $('#photo-list').innerHTML = photos.map((photo, i) => `<div class="photo-item"><img src="${escapeHtml(photo.preview)}" alt="Foto ${i + 1}" />
    <div class="photo-caption">${i === 0 ? 'CAPA · ' : ''}${photo.file ? 'Nova foto' : 'Foto salva'}</div>
    <div class="photo-tools"><button type="button" data-photo="up" data-index="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Mover foto para frente">←</button><button type="button" data-photo="down" data-index="${i}" ${i === photos.length - 1 ? 'disabled' : ''} aria-label="Mover foto para trás">→</button><button type="button" class="remove" data-photo="remove" data-index="${i}" aria-label="Remover foto">×</button></div></div>`).join('');
  if (!photos.length) $('#photo-list').innerHTML = '<div class="empty-list" style="grid-column:1/-1;padding:24px 15px"><p>Seu editorial começa com uma foto.</p></div>';
}
$('#photo-list').addEventListener('click', event => {
  const button = event.target.closest('[data-photo]');
  if (!button || busy) return;
  const index = Number(button.dataset.index);
  if (button.dataset.photo === 'remove') {
    const [removed] = photos.splice(index, 1);
    if (removed?.file) URL.revokeObjectURL(removed.preview);
  } else {
    const next = button.dataset.photo === 'up' ? index - 1 : index + 1;
    if (next < 0 || next >= photos.length) return;
    [photos[index], photos[next]] = [photos[next], photos[index]];
  }
  renderPhotos();
});
$('#camera-trigger').addEventListener('click', () => $('#camera-input').click());
$('#gallery-trigger').addEventListener('click', () => $('#gallery-input').click());
function receiveFiles(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (photos.length + files.length > 6) { toast('Cada peça aceita até 6 fotos.'); return; }
  for (const file of files) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type.toLowerCase())) { toast(`Formato não suportado: ${file.name}. Use JPEG, PNG ou WebP.`); continue; }
    if (file.size > 15 * 1024 * 1024) { toast(`${file.name} excede 15 MB.`); continue; }
    photos.push({ file, preview: URL.createObjectURL(file), alt: '' });
  }
  renderPhotos();
}
$('#camera-input').addEventListener('change', receiveFiles);
$('#gallery-input').addEventListener('change', receiveFiles);
function syncPublishButton() {
  $('#save-product').textContent = $('#field-visibility').value === 'published'
    ? (current ? 'Salvar e publicar ↗' : 'Publicar peça ↗') : 'Salvar alterações ↗';
}
$('#field-visibility').addEventListener('change', syncPublishButton);
$('#save-draft').addEventListener('click', () => { $('#field-visibility').value = 'draft'; syncPublishButton(); saveProduct(); });
form.addEventListener('submit', event => { event.preventDefault(); saveProduct(); });

async function optimizeImage(file) {
  // Redimensiona fotos da câmera antes do upload, reduzindo o consumo de Storage.
  const tmpUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = tmpUrl;
    await img.decode();
    const limit = 1600;
    const ratio = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem neste navegador.');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .84));
    if (!blob) throw new Error('Não foi possível otimizar essa fotografia.');
    return blob;
  } finally { URL.revokeObjectURL(tmpUrl); }
}
async function saveProduct() {
  if (busy) return;
  if (previewMode) { editorError('Esta é uma prévia visual. Configure o Supabase para salvar e publicar de verdade.'); return; }
  if (!form.reportValidity()) { editorError('Preencha os campos obrigatórios.'); return; }
  const isPublished = $('#field-visibility').value === 'published';
  if (isPublished && photos.length === 0) { editorError('Para publicar, adicione ao menos uma foto da peça.'); return; }
  const price = Number($('#field-price').value);
  if (!Number.isFinite(price) || price <= 0) { editorError('Informe um preço válido, maior que zero.'); return; }
  const productId = current?.id || makeUuid();
  const newUploads = [];
  setBusy(true, 'Preparando sua peça...');
  try {
    const imageEntries = [];
    for (let index = 0; index < photos.length; index++) {
      const photo = photos[index];
      if (photo.path) { imageEntries.push({ path: photo.path, alt: `Foto de ${$('#field-name').value.trim()}` }); continue; }
      $('#editor-feedback').textContent = `Otimizando e enviando foto ${index + 1} de ${photos.length}...`;
      const blob = await optimizeImage(photo.file);
      if (blob.size > 10 * 1024 * 1024) throw new Error('Uma das fotos ultrapassou 10 MB após otimização.');
      const path = `${activeUser.id}/${productId}/${makeUuid()}.jpg`;
      const { error } = await db.storage.from('product-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      newUploads.push(path);
      imageEntries.push({ path, alt: `Foto de ${$('#field-name').value.trim()}` });
    }
    const previousPaths = (current?.images || []).map(img => img.path);
    const removedPaths = previousPaths.filter(path => !imageEntries.some(img => img.path === path));
    const payload = {
      name: $('#field-name').value.trim(), description: $('#field-description').value.trim(),
      category: $('#field-category').value, price, size: $('#field-size').value,
      color: $('#field-color').value, patterned: $('#field-patterned').value === 'true',
      condition: $('#field-condition').value, material: $('#field-material').value.trim(),
      badge: $('#field-badge').value.trim() || null, availability: $('#field-availability').value,
      is_published: isPublished, images: imageEntries,
    };
    $('#editor-feedback').textContent = 'Salvando informações...';
    const query = current
      ? db.from('products').update(payload).eq('id', productId)
      : db.from('products').insert({ id: productId, ...payload });
    const { error } = await query;
    if (error) throw error;
    if (removedPaths.length) {
      const { error: cleanupError } = await db.storage.from('product-photos').remove(removedPaths);
      if (cleanupError) console.warn('Fotos antigas não removidas:', cleanupError);
    }
    toast(isPublished ? 'Peça publicada! Já pode aparecer na loja.' : 'Rascunho salvo no Supabase.');
    setBusy(false);
    closeEditor();
    await loadProducts();
  } catch (error) {
    if (newUploads.length) {
      const { error: cleanupError } = await db.storage.from('product-photos').remove(newUploads);
      if (cleanupError) console.warn('Fotos órfãs não removidas:', cleanupError);
    }
    setBusy(false);
    editorError('Não foi possível salvar: ' + errorText(error));
  }
}
$('#delete-product').addEventListener('click', async () => {
  if (!current || busy) return;
  if (previewMode) { editorError('Prévia visual: exclusão desativada.'); return; }
  if (!window.confirm(`Excluir definitivamente "${current.name}"? Essa ação não pode ser desfeita.`)) return;
  const p = current;
  setBusy(true, 'Excluindo peça...');
  try {
    const { error } = await db.from('products').delete().eq('id', p.id);
    if (error) throw error;
    const paths = (p.images || []).map(img => img.path);
    if (paths.length) {
      const { error: cleanupError } = await db.storage.from('product-photos').remove(paths);
      if (cleanupError) console.warn('Fotos não removidas:', cleanupError);
    }
    setBusy(false); closeEditor(); await loadProducts();
    toast('Peça excluída do inventário.');
  } catch (error) { setBusy(false); editorError('Não foi possível excluir: ' + errorText(error)); }
});

$('#preview-admin').addEventListener('click', () => {
  previewMode = true;
  products = sampleProducts.map(p => ({
    ...p, is_published: true,
    availability: p.available ? 'available' : 'sold',
    created_at: p.publishedAt,
  }));
  hide($('#setup-screen')); show($('#app-screen'));
  $('#logged-email').textContent = 'PRÉVIA VISUAL';
  updateStats(); renderList();
  $('#inventory-message').textContent = 'MODO DEMONSTRAÇÃO · Nada será salvo ou publicado. Configure o Supabase para começar.';
});
setupSelects();
start();
