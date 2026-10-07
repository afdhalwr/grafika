export type Entry = {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  value: number;
  note: string;
};

export type Dataset = {
  id: string;
  name: string;
  unit: string;
  color: number; // slot palet 0–7
  target: number; // 0 = tanpa target
  higherIsBetter: boolean;
  catColors: Record<string, number>;
  entries: Entry[];
  order: number; // urutan di sidebar
};

/** Dokumen grafika_users/{uid}. */
export type Profile = {
  name: string;
  email: string;
  createdAt: string;
  activeId: string | null;
  welcomeDismissed: boolean;
};

export type RangeKey = '7' | '30' | '90' | 'all' | 'custom';
export type Granularity = 'day' | 'week' | 'month';

/** Preferensi tampilan, disimpan per pengguna di localStorage. */
export type Prefs = {
  range: RangeKey;
  gran: Granularity;
  compare: boolean;
  from: string | null;
  to: string | null;
  perPage: number;
};
