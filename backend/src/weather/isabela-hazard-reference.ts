/**
 * Isabela City, Basilan — hazard **planning reference** by barangay code (matches `prisma/seed.ts` IC-* codes).
 * Replace or enrich with official LGU / MGB GeoJSON when available.
 */
export const ISABELA_HAZARD_DISCLAIMER =
  'Reference list tied to the ICDRRMO barangay master data — validate against official Isabela City DRRM / MGB hazard maps before operations.';

export type HazardZoneType = 'FLOOD_COASTAL_RIVER' | 'FLOOD_RIVERINE' | 'LANDSLIDE';

export type HazardZoneRow = {
  type: HazardZoneType;
  label: string;
  description: string;
  barangays: { code: string; name: string }[];
};

/** Barangay names / codes — keep in sync with `prisma/seed.ts` (45 barangays, IC-001…IC-045). */
export const ISABELA_HAZARD_ZONES: HazardZoneRow[] = [
  {
    type: 'FLOOD_COASTAL_RIVER',
    label: 'Coastal / surge / river mouth',
    description: 'Higher exposure to coastal flooding, storm surge, and tide‑influenced river mouths.',
    barangays: [
      { code: 'IC-033', name: 'Port Area' },
      { code: 'IC-038', name: 'Seaside' },
      { code: 'IC-034', name: 'Riverside' },
      { code: 'IC-028', name: 'Marketsite' },
      { code: 'IC-021', name: 'Lampinigan' },
      { code: 'IC-031', name: 'Panigayan' },
      { code: 'IC-044', name: 'Tampalan' },
    ],
  },
  {
    type: 'FLOOD_RIVERINE',
    label: 'Riverine / low‑lying basins',
    description: 'Inner basins and low gradients where runoff concentrates during heavy rain.',
    barangays: [
      { code: 'IC-012', name: 'Isabela Proper' },
      { code: 'IC-037', name: 'Santa Cruz' },
      { code: 'IC-009', name: 'Carbon' },
      { code: 'IC-030', name: 'Menzi' },
      { code: 'IC-040', name: 'Sumagdang' },
      { code: 'IC-027', name: 'Marang-marang' },
      { code: 'IC-001', name: 'Aguada' },
      { code: 'IC-039', name: 'Small Kapatagan' },
    ],
  },
  {
    type: 'LANDSLIDE',
    label: 'Landslide‑prone slopes',
    description: 'Upland / steep sections — watch during sustained intense rainfall.',
    barangays: [
      { code: 'IC-003', name: 'Baluno' },
      { code: 'IC-006', name: 'Busay' },
      { code: 'IC-022', name: 'Lanote' },
      { code: 'IC-025', name: 'Makiri' },
      { code: 'IC-043', name: 'Tabuk' },
      { code: 'IC-004', name: 'Begang' },
      { code: 'IC-026', name: 'Maligue' },
      { code: 'IC-018', name: 'Kapayawan' },
    ],
  },
];
