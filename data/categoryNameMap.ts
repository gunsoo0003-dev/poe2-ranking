export const categoryNameMapEn: Record<string, string> = {
  활: 'Bow',
  석궁: 'Crossbow',
  창: 'Spear',
  지팡이: 'Staff',
  마법봉: 'Wand',
  셉터: 'Sceptre',
  육척봉: 'Quarterstaff',
  한손철퇴: 'One-Hand Mace',
  양손철퇴: 'Two-Hand Mace',
  부적: 'Talisman',
  화살통: 'Quiver',
  방패: 'Shield',
  버클러: 'Buckler',
  집중구: 'Focus',
  반지: 'Ring',
  목걸이: 'Amulet',
  허리띠: 'Belt',
  갑옷: 'Body Armour',
  투구: 'Helmet',
  장갑: 'Gloves',
  장화: 'Boots',
};

export function getCategoryName(label: string, locale?: 'ko' | 'en') {
  if (locale === 'en') {
    return categoryNameMapEn[label] ?? label;
  }

  return label;
}