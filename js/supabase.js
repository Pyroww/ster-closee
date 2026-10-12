import { CONFIG } from './config.js';

// O client só é baixado depois que o Supabase for configurado.
// No modo local não configurado, a vitrine continua com peças fictícias.
export const isConfigured = Boolean(
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(CONFIG.supabaseUrl.trim()) &&
  CONFIG.supabasePublishableKey.trim()
);
let pending;
export async function getSupabase() {
  if (!isConfigured) throw new Error('Configure a URL e a chave pública do Supabase em js/config.js.');
  if (!pending) {
    pending = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(({ createClient }) => createClient(
        CONFIG.supabaseUrl.trim().replace(/\/$/, ''),
        CONFIG.supabasePublishableKey.trim(),
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      )).catch(error => { pending = null; throw error; });
  }
  return pending;
}

export function imageUrl(supabase, path) {
  if (!path) return '';
  return supabase.storage.from('product-photos').getPublicUrl(path).data.publicUrl;
}
