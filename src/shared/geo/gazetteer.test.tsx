import { describe, expect, it } from 'vitest';
import { nearestPlaceName, placeNames } from './gazetteer';

describe('nearestPlaceName', () => {
  it('names a position after the place it is standing in', () => {
    expect(nearestPlaceName([10.3951, 63.4305])).toBe('Trondheim');
  });

  it('names a position in a city after its part of town', () => {
    // Grünerløkka, Oslo — the list carries city districts, not just cities.
    expect(nearestPlaceName([10.758, 59.923])).toBe('Grünerløkka, Oslo');
  });

  it('names a rural position after the nearest small place', () => {
    // A point in the countryside outside Vikersund: the nearest place is a
    // hamlet a few hundred metres away, qualified by its municipality so the
    // name means something to someone who does not know the area.
    expect(nearestPlaceName([10.0, 60.0])).toBe('Flattum, Modum');
  });

  it('names a position across the Swedish border after a Swedish place', () => {
    expect(nearestPlaceName([12.3, 59.88])).toBe('Charlottenberg, Eda');
  });

  it('always returns a usable name, even far outside the covered area', () => {
    // The lookup has no cut-off distance on purpose: a stop must always get a
    // name, and a wrong-but-far name is visibly wrong, whereas an empty name
    // would fail the form's own validation.
    expect(nearestPlaceName([30.0, 40.0]).length).toBeGreaterThanOrEqual(2);
  });
});

describe('the place list', () => {
  it('parses every line of places.txt', () => {
    // Roughly 21 000 places; the assertion is loose so regenerating the list
    // from a newer GeoNames dump does not fail the suite, but a parse that
    // silently dropped most of the file would.
    expect(placeNames().length).toBeGreaterThan(20000);
  });

  it('gives every place a name long enough to pass stop-name validation', () => {
    // The form requires at least two characters for a stop name; anything
    // shorter here would produce an automatic name the form then rejects, in a
    // field the user cannot edit while automatic naming is on.
    expect(placeNames().filter(name => name.length < 2)).toEqual([]);
  });
});
