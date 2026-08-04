import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { flexBookingUrl, flexTourJourneyCode } from './flexTourIdentity';

describe('flexTourJourneyCode', () => {
  it('is the service journey plus its service date', () => {
    expect(flexTourJourneyCode('MAL:ServiceJourney:0e20a3a3', dayjs('2026-08-10T09:00:00'))).toBe(
      'MAL:ServiceJourney:0e20a3a3:2026-08-10'
    );
  });

  it('takes the date, not the time of day — one tour per journey per service date', () => {
    const morning = flexTourJourneyCode('MAL:ServiceJourney:x', dayjs('2026-08-10T06:00:00'));
    const evening = flexTourJourneyCode('MAL:ServiceJourney:x', dayjs('2026-08-10T22:30:00'));

    expect(morning).toBe(evening);
  });
});

describe('flexBookingUrl', () => {
  it('points at the flex booking page for this tour', () => {
    expect(
      flexBookingUrl(
        'http://localhost:5000',
        'MAL',
        'MAL:ServiceJourney:0e20a3a3',
        dayjs('2026-08-10')
      )
    ).toBe('http://localhost:5000/book-flex/MAL/MAL:ServiceJourney:0e20a3a3:2026-08-10');
  });

  it('carries the codespace it was given, not the journey ref’s prefix', () => {
    // They normally agree — the form warns on a mismatch — but the URL must reflect the data
    // source the tour is written under, which is what the booking page authorizes against.
    const url = flexBookingUrl('https://x', 'ATB', 'MAL:ServiceJourney:y', dayjs('2026-08-10'));

    expect(url).toBe('https://x/book-flex/ATB/MAL:ServiceJourney:y:2026-08-10');
  });
});
