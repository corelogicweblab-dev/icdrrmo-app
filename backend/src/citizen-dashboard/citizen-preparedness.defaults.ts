export type PreparednessCheckItem = {
  id: string;
  label: string;
  labelTl: string;
  done: boolean;
  doneAt: string | null;
};

export const DEFAULT_PREPAREDNESS_CHECKLIST: PreparednessCheckItem[] = [
  { id: 'go-bag', label: '72-hour go bag packed', labelTl: 'Go bag (72 oras)', done: false, doneAt: null },
  { id: 'family-plan', label: 'Family emergency plan', labelTl: 'Plano ng pamilya', done: false, doneAt: null },
  { id: 'evac-route', label: 'Know evacuation route', labelTl: 'Alam ang ruta ng evac', done: false, doneAt: null },
  { id: 'first-aid', label: 'First aid kit stocked', labelTl: 'First aid kit', done: false, doneAt: null },
  { id: 'documents', label: 'Waterproof document pouch', labelTl: 'Waterproof na dokumento', done: false, doneAt: null },
  { id: 'water', label: '3 days drinking water', labelTl: 'Tubig (3 araw)', done: false, doneAt: null },
  { id: 'meds', label: '7-day medication supply', labelTl: 'Gamot (7 araw)', done: false, doneAt: null },
  { id: 'radio', label: 'Battery radio / charger', labelTl: 'Radyo / power bank', done: false, doneAt: null },
];

export const PREPAREDNESS_BADGES = [
  { id: 'starter', label: 'Preparedness Starter', minDone: 2 },
  { id: 'ready', label: 'Barangay Ready', minDone: 5 },
  { id: 'champion', label: 'Disaster Ready Champion', minDone: 8 },
] as const;

export function computeBadges(doneCount: number): string[] {
  return PREPAREDNESS_BADGES.filter((b) => doneCount >= b.minDone).map((b) => b.id);
}
