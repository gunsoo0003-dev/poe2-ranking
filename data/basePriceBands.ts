export type BasePriceBand = {
  label: string;
  min?: number;
  currency?: string;
};

export const basePriceBands: BasePriceBand[] = [
  { label: '전체 저가순' },

  { label: '1 divine 이상', min: 1, currency: 'divine' },
  { label: '2 divine 이상', min: 2, currency: 'divine' },
  { label: '5 divine 이상', min: 5, currency: 'divine' },
  { label: '10 divine 이상', min: 10, currency: 'divine' },
  { label: '20 divine 이상', min: 20, currency: 'divine' },
  { label: '50 divine 이상', min: 50, currency: 'divine' },
  { label: '100 divine 이상', min: 100, currency: 'divine' },
  { label: '150 divine 이상', min: 150, currency: 'divine' },
  { label: '200 divine 이상', min: 200, currency: 'divine' },
  { label: '250 divine 이상', min: 250, currency: 'divine' },
  { label: '300 divine 이상', min: 300, currency: 'divine' },
  { label: '350 divine 이상', min: 350, currency: 'divine' },
  { label: '400 divine 이상', min: 400, currency: 'divine' },
];