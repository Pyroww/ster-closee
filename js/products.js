// CATÁLOGO DEMONSTRATIVO: substitua por fotos e dados reais na futura integração com Supabase.
// Cada peça tem um ID e código único. Use imagem hospedada publicamente para aparecer no WhatsApp.
// As imagens do Unsplash são apenas exemplos externos; o fallback local funciona sem internet.
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=850&q=84`;
const fallback = (name) => `/assets/produtos/${name}.svg`;

export const categories = [
  { id: 'todos', name: 'Tudo', icon: '✦' },
  { id: 'blusas', name: 'Blusas', icon: '♡' },
  { id: 'camisas', name: 'Camisas', icon: '↗' },
  { id: 'calcas', name: 'Calças', icon: '✿' },
  { id: 'vestidos', name: 'Vestidos', icon: '✧' },
  { id: 'saias', name: 'Saias', icon: '★' },
  { id: 'shorts', name: 'Shorts', icon: '✦' },
  { id: 'casacos', name: 'Casacos', icon: '☁' },
  { id: 'sapatos', name: 'Sapatos', icon: '✳' },
  { id: 'acessorios', name: 'Acessórios', icon: '♥' },
  { id: 'outros', name: 'Outros', icon: '·' },
];
export const sizes = ['PP', 'P', 'M', 'G', 'GG', 'XGG', '34', '35', '36', '37', '38', '39', '40', '42', '44', '46', '48', 'Único'];

export const products = [
  {
    id: 'baby-tee-coracao', sku: 'SC-001', name: 'Baby tee coração', category: 'blusas', categoryLabel: 'Blusas',
    price: 39.9, size: 'P', color: 'Rosa', patterned: false, condition: 'Ótimo estado',
    description: 'Baby tee rosa com referência ao estilo casual dos anos 2000. Combina com jeans e acessórios vintage.',
    material: 'Malha de algodão', badge: 'seleção ster', available: true, publishedAt: '2026-10-12',
    images: [{ src: photo('photo-1503342217505-b0a15ec3261c'), fallback: fallback('tee'), alt: 'Foto ilustrativa de blusa casual' }],
  },
  {
    id: 'jeans-wide-leg', sku: 'SC-002', name: 'Jeans wide leg retrô', category: 'calcas', categoryLabel: 'Calças',
    price: 89.9, size: '38', color: 'Azul', patterned: false, condition: 'Ótimo estado',
    description: 'A calça de cintura confortável e caimento amplo que faz qualquer look parecer saído de uma revista Y2K.',
    material: 'Jeans', badge: 'novo drop', available: true, publishedAt: '2026-10-11',
    images: [{ src: photo('photo-1541099649105-f69ad21f3246'), fallback: fallback('jeans'), alt: 'Foto ilustrativa de calça jeans' }],
  },
  {
    id: 'vestido-floral', sku: 'SC-003', name: 'Vestidinho floral', category: 'vestidos', categoryLabel: 'Vestidos',
    price: 69.9, size: 'M', color: 'Colorido', patterned: true, condition: 'Excelente estado',
    description: 'Levinho, delicado e cheio de personalidade. Um vestido floral para produções leves e atemporais.',
    material: 'Tecido leve', badge: 'garimpo especial', available: true, publishedAt: '2026-10-10',
    images: [{ src: photo('photo-1515372039744-b8f02a3ae446'), fallback: fallback('dress'), alt: 'Foto ilustrativa de vestido florido' }],
  },
  {
    id: 'cardigan-rosa', sku: 'SC-004', name: 'Cardigã rosa nuvem', category: 'casacos', categoryLabel: 'Casacos',
    price: 59.9, size: 'G', color: 'Rosa', patterned: false, condition: 'Bom estado',
    description: 'Aquele cardigan aconchegante que combina com dias de filme, café e looks em camadas.',
    material: 'Tricô', badge: 'edição vintage', available: true, publishedAt: '2026-10-09',
    images: [{ src: photo('photo-1434389677669-e08b4cac3105'), fallback: fallback('cardigan'), alt: 'Foto ilustrativa de cardigan' }],
  },
  {
    id: 'saia-jeans', sku: 'SC-005', name: 'Mini saia jeans', category: 'saias', categoryLabel: 'Saias',
    price: 49.9, size: '36', color: 'Azul', patterned: false, condition: 'Ótimo estado',
    description: 'Uma clássica mini saia jeans para criar mil combinações e entrar no mood dos anos 2000.',
    material: 'Jeans', badge: null, available: true, publishedAt: '2026-10-08',
    images: [{ src: photo('photo-1583496661160-fb5886a0aaaa'), fallback: fallback('skirt'), alt: 'Foto ilustrativa de mini saia' }],
  },
  {
    id: 'bolsa-baguete', sku: 'SC-006', name: 'Bolsa baguete candy', category: 'acessorios', categoryLabel: 'Acessórios',
    price: 44.9, size: 'Único', color: 'Rosa', patterned: false, condition: 'Excelente estado',
    description: 'Mini bolsa com a silhueta queridinha do início dos anos 2000. Um acessório que complementa looks minimalistas ou produções mais ousadas.',
    material: 'Material sintético', badge: 'destaque', available: true, publishedAt: '2026-10-07',
    images: [{ src: photo('photo-1548036328-c9fa89d128fa'), fallback: fallback('bag'), alt: 'Foto ilustrativa de bolsa feminina' }],
  },
  {
    id: 'tenis-retro', sku: 'SC-007', name: 'Tênis retrô color pop', category: 'sapatos', categoryLabel: 'Sapatos',
    price: 79.9, size: '38', color: 'Vermelho', patterned: false, condition: 'Bom estado',
    description: 'Tênis cheio de personalidade, ótimo para complementar uma combinação casual.',
    material: 'Tecido e borracha', badge: null, available: true, publishedAt: '2026-10-06',
    images: [{ src: photo('photo-1542291026-7eec264c27ff'), fallback: fallback('shoe'), alt: 'Foto ilustrativa de tênis vermelho' }],
  },
  {
    id: 'camisa-vintage', sku: 'SC-008', name: 'Camisa vintage listrada', category: 'blusas', categoryLabel: 'Blusas',
    price: 54.9, size: 'M', color: 'Verde', patterned: true, condition: 'Ótimo estado',
    description: 'Camisa de botão com um ar vintage encantador. Use fechadinha ou como terceira peça.',
    material: 'Algodão', badge: 'novo drop', available: true, publishedAt: '2026-10-05',
    images: [{ src: photo('photo-1598554747436-c9293d6a588f'), fallback: fallback('shirt'), alt: 'Foto ilustrativa de camisa casual' }],
  },
  {
    id: 'oculos-candy', sku: 'SC-009', name: 'Óculos coração vintage', category: 'acessorios', categoryLabel: 'Acessórios',
    price: 29.9, size: 'Único', color: 'Rosa', patterned: false, condition: 'Ótimo estado',
    description: 'Um acessório divertido para dar um toque retrô às fotos e aos looks.',
    material: 'Acetato', badge: null, available: true, publishedAt: '2026-10-04',
    images: [{ src: photo('photo-1511499767150-a48a237f0083'), fallback: fallback('glasses'), alt: 'Foto ilustrativa de óculos' }],
  },
  {
    id: 'cargo-bege', sku: 'SC-010', name: 'Calça cargo bege', category: 'calcas', categoryLabel: 'Calças',
    price: 74.9, size: '40', color: 'Bege', patterned: false, condition: 'Ótimo estado',
    description: 'Uma calça versátil, com bolsos utilitários e toda a atitude streetwear Y2K.',
    material: 'Sarja', badge: null, available: true, publishedAt: '2026-10-03',
    images: [{ src: photo('photo-1473966968600-fa801b869a1a'), fallback: fallback('cargo'), alt: 'Foto ilustrativa de calça casual' }],
  },
  {
    id: 'jaqueta-jeans', sku: 'SC-011', name: 'Jaqueta jeans oversized', category: 'casacos', categoryLabel: 'Casacos',
    price: 99.9, size: 'G', color: 'Azul', patterned: false, condition: 'Ótimo estado',
    description: 'A jaqueta que deixa qualquer produção muito mais estilosa. Corte soltinho e vibe retrô.',
    material: 'Jeans', badge: 'vendida', available: false, publishedAt: '2026-10-02',
    images: [{ src: photo('photo-1551028719-00167b16eac5'), fallback: fallback('jacket'), alt: 'Foto ilustrativa de jaqueta jeans' }],
  },
  {
    id: 'vestido-poa', sku: 'SC-012', name: 'Vestido poá delicado', category: 'vestidos', categoryLabel: 'Vestidos',
    price: 64.9, size: 'P', color: 'Preto', patterned: true, condition: 'Excelente estado',
    description: 'Poá nunca sai de moda: um vestidinho leve com a dose certa de nostalgia.',
    material: 'Viscose', badge: 'achado da vez', available: true, publishedAt: '2026-10-01',
    images: [{ src: photo('photo-1539008835657-9e8e9680c956'), fallback: fallback('polka'), alt: 'Foto ilustrativa de vestido' }],
  },
];
