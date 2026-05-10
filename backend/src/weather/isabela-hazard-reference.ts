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

/** Barangay names from seed — keep in sync with `prisma/seed.ts` when codes change. */
export const ISABELA_HAZARD_ZONES: HazardZoneRow[] = [
  {
    type: 'FLOOD_COASTAL_RIVER',
    label: 'Coastal / surge / river mouth',
    description: 'Higher exposure to coastal flooding, storm surge, and tide‑influenced river mouths.',
    barangays: [
      { code: 'IC-026', name: 'Port Area' },
      { code: 'IC-028', name: 'Seaside' },
      { code: 'IC-027', name: 'Riverside' },
      { code: 'IC-022', name: 'Marketsite' },
      { code: 'IC-016', name: 'Lampinigan' },
      { code: 'IC-024', name: 'Panigayan' },
      { code: 'IC-034', name: 'Tampalan' },
    ],
  },
  {
    type: 'FLOOD_RIVERINE',
    label: 'Riverine / low‑lying basins',
    description: 'Inner basins and low gradients where runoff concentrates during heavy rain.',
    barangays: [
      { code: 'IC-012', name: 'Isabela Proper' },
      { code: 'IC-001', name: 'City Proper (Poblacion)' },
      { code: 'IC-009', name: 'Carbon' },
      { code: 'IC-023', name: 'Menzi' },
      { code: 'IC-030', name: 'Sumagdang' },
      { code: 'IC-021', name: 'Marang-marang' },
      { code: 'IC-002', name: 'Aguada' },
    ],
  },
  {
    type: 'LANDSLIDE',
    label: 'Landslide‑prone slopes',
    description: 'Upland / steep sections — watch during sustained intense rainfall.',
    barangays: [
      { code: 'IC-003', name: 'Baluno' },
      { code: 'IC-006', name: 'Busay' },
      { code: 'IC-017', name: 'Lanote' },
      { code: 'IC-020', name: 'Makiri' },
      { code: 'IC-033', name: 'Tabuk' },
      { code: 'IC-036', name: 'Tongbato' },
      { code: 'IC-037', name: 'Ubit' },
      { code: 'IC-004', name: 'Begang' },
    ],
  },
];
