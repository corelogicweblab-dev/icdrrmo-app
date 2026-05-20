import {
  bboxToPolygon,
  buildOwmRasterFeatures,
  parseGeorssPoint,
  parseGeorssPolygon,
} from './geojson-parse.util';

describe('geojson-parse.util', () => {
  it('parses georss point as lat lon', () => {
    expect(parseGeorssPoint('12.5 121.0', 'lat-lon')).toEqual([121.0, 12.5]);
  });

  it('builds closed polygon ring from bbox', () => {
    const poly = bboxToPolygon([1, 2, 3, 4]);
    expect(poly.coordinates[0][0]).toEqual([1, 2]);
    expect(poly.coordinates[0][4]).toEqual([1, 2]);
  });

  it('parses georss polygon', () => {
    const ring = parseGeorssPolygon('1 2 3 4 5 6');
    expect(ring?.length).toBeGreaterThanOrEqual(4);
    expect(ring?.[0]).toEqual([2, 1]);
  });

  it('builds OWM raster features', () => {
    const fs = buildOwmRasterFeatures(
      [{ id: 'temp', label: 'Temp', urlTemplate: 'https://example/{z}/{x}/{y}' }],
      [121, 6, 122, 7],
    );
    expect(fs).toHaveLength(1);
    expect(fs[0].properties.kind).toBe('raster-tile-layer');
    expect(fs[0].geometry.type).toBe('Polygon');
  });
});
