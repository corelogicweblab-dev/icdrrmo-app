import { GdacsGeorssService } from './gdacs-georss.service';

describe('GdacsGeorssService', () => {
  const svc = new GdacsGeorssService();

  it('parses sample GeoRSS item with georss:point', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel>
<item>
  <title>Green alert for Tropical Cyclone SAMPLE</title>
  <link>https://www.gdacs.org/report.aspx?eventid=123</link>
  <description>Test event</description>
  <georss:point>12.5 121.0</georss:point>
  <gdacs:eventtype>TC</gdacs:eventtype>
  <gdacs:alertlevel>Green</gdacs:alertlevel>
  <gdacs:eventid>TC123</gdacs:eventid>
</item>
</channel></rss>`;
    const features = svc.parseGeoRss(xml);
    expect(features).toHaveLength(1);
    expect(features[0].geometry.type).toBe('Point');
    expect(features[0].geometry.coordinates).toEqual([121.0, 12.5]);
    expect(features[0].properties.eventType).toBe('TC');
    expect(features[0].properties.alertLevel).toBe('Green');
  });
});
