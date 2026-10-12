import { categories } from './products.js';
import { imageUrl } from './supabase.js';

const categoryLabel = Object.fromEntries(categories.map(item => [item.id, item.name]));
export const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = value => BRL.format(Number(value) || 0);

export function toCatalogProduct(row, supabase) {
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id: row.id, sku: row.sku, name: row.name,
    category: row.category, categoryLabel: categoryLabel[row.category] || 'Outros',
    price: Number(row.price), size: row.size, color: row.color,
    patterned: row.patterned, condition: row.condition || 'Não informado',
    description: row.description || '', material: row.material || 'Não informado',
    badge: row.badge || null,
    available: row.availability === 'available',
    availability: row.availability,
    publishedAt: row.published_at || row.created_at || '',
    images: images.map(item => ({
      src: imageUrl(supabase, item.path),
      fallback: '/assets/favicon.svg',
      alt: item.alt || `Foto de ${row.name}`,
    })).filter(img => img.src),
  };
}
