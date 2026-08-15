/**
 * Mood Characters — Plush teddy bear illustrations (AI-generated PNGs).
 * Each emotion is a unique cute stuffed bear with fabric texture, button eyes, and stitched seams.
 * Soft, cuddly, children's toy aesthetic — not emoji-style.
 *
 * Usage: MoodCharacters.getSVG('Alegre')  → '<img src="..." ...>'
 *        MoodCharacters.getPath('Alegre') → 'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/6ffeca792_generated_image.png'
 */

const MoodCharacters = (function () {
  // Map mood name → PNG file path
  const paths = {
    'Alegre':    'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/6ffeca792_generated_image.png',
    'Grato':     'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/9483e1a4e_generated_image.png',
    'Tranquilo': 'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/f01afa1c3_generated_image.png',
    'Cansado':   'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/753f2465b_generated_image.png',
    'Ansioso':   'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/299fc973c_generated_image.png',
    'Vergonha':  'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/38031c4da_generated_image.png',
    'Triste':    'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/b69dbe7b5_generated_image.png',
    'Raiva':     'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/7539c9296_generated_image.png',
    'Medo':      'https://media.base44.com/images/public/6a7eec519b41f7d4409345e9/fa75fe039_generated_image.png'
  };

  // Backward compatibility: old mood names → new mood names
  const legacyMap = {
    'Radiante': 'Alegre',
    'Bem': 'Tranquilo',
    'Neutro': 'Tranquilo',
    'Difícil': 'Triste',
    'Dificil': 'Triste',
    'Nojo': 'Ansioso',
    'Inveja': 'Vergonha',
    'Tédio': 'Cansado',
    'Tedio': 'Cansado'
  };

  // Mood definitions with default wellness scores
  const moods = [
    { name: 'Alegre',    score: 10, color: '#FFD54F', desc: 'Feliz e radiante' },
    { name: 'Grato',     score: 9,  color: '#F48FB1', desc: 'Agradecido' },
    { name: 'Tranquilo', score: 8,  color: '#81C784', desc: 'Em paz' },
    { name: 'Cansado',   score: 5,  color: '#90A4AE', desc: 'Esgotado' },
    { name: 'Ansioso',   score: 4,  color: '#BA68C8', desc: 'Preocupado' },
    { name: 'Vergonha',  score: 3,  color: '#E91E63', desc: 'Envergonhado' },
    { name: 'Triste',    score: 2,  color: '#42A5F5', desc: 'Desanimado' },
    { name: 'Raiva',     score: 1,  color: '#EF5350', desc: 'Irritado' },
    { name: 'Medo',      score: 1,  color: '#7B1FA2', desc: 'Amedrontado' }
  ];

  function resolveMood(moodName) {
    if (paths[moodName]) return moodName;
    if (legacyMap[moodName]) return legacyMap[moodName];
    return 'Tranquilo';
  }

  function getPath(moodName) {
    return paths[resolveMood(moodName)] || paths['Tranquilo'];
  }

  function getSVG(moodName, size) {
    const s = size || 32;
    const resolved = resolveMood(moodName);
    const path = getPath(resolved);
    return `<img src="${path}" width="${s}" height="${s}" alt="${resolved}" style="display:inline-block;vertical-align:middle" loading="lazy" />`;
  }

  function getMoodList() {
    return moods;
  }

  return {
    getSVG,
    getPath,
    resolveMood,
    getMoodList
  };
})();

if (typeof window !== 'undefined') {
  window.MoodCharacters = MoodCharacters;
}
