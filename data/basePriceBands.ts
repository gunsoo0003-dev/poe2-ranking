export type BasePriceBand = {
  label: string;
  min?: number;
  currency?: string;
};

export const basePriceBands: BasePriceBand[] = [
  { label: '전체 저가순' },

  { label: '1 exalted 이상', min: 1, currency: 'exalted' },
  { label: '2 exalted 이상', min: 2, currency: 'exalted' },
  { label: '5 exalted 이상', min: 5, currency: 'exalted' },
  { label: '10 exalted 이상', min: 10, currency: 'exalted' },
  { label: '20 exalted 이상', min: 20, currency: 'exalted' },
  { label: '50 exalted 이상', min: 50, currency: 'exalted' },

  { label: '1 divine 이상', min: 1, currency: 'divine' },
  { label: '2 divine 이상', min: 2, currency: 'divine' },
  { label: '5 divine 이상', min: 5, currency: 'divine' },
  { label: '10 divine 이상', min: 10, currency: 'divine' },
  { label: '20 divine 이상', min: 20, currency: 'divine' },
  { label: '50 divine 이상', min: 50, currency: 'divine' },
  { label: '100 divine 이상', min: 100, currency: 'divine' },
];