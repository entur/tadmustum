import { describe, it, expect } from 'vitest';
import type { IdTokenClaims } from 'oidc-client-ts';
import { pickDisplayName } from './authUtils';

const NAMESPACE = 'https://ror.entur.io/preferred_name';

// Only the claims under test matter; the required id-token fields are noise here.
const claims = (extra: Record<string, unknown>): IdTokenClaims =>
  ({
    iss: 'https://partner.dev.entur.org',
    sub: 'auth0|123',
    aud: 'client',
    exp: 0,
    iat: 0,
    ...extra,
  }) as IdTokenClaims;

describe('pickDisplayName', () => {
  it('prefers the namespaced Entur claim over the standard ones', () => {
    const profile = claims({
      [NAMESPACE]: 'Nina Nordmann',
      name: 'standard name',
      preferred_username: 'nina',
      email: 'nina@entur.org',
    });
    expect(pickDisplayName(profile, NAMESPACE)).toBe('Nina Nordmann');
  });

  it('falls back through name, preferred_username and email in order', () => {
    expect(pickDisplayName(claims({ name: 'Standard Name', preferred_username: 'nina' }))).toBe(
      'Standard Name'
    );
    expect(pickDisplayName(claims({ preferred_username: 'nina', email: 'n@entur.org' }))).toBe(
      'nina'
    );
    expect(pickDisplayName(claims({ email: 'n@entur.org' }))).toBe('n@entur.org');
  });

  it('skips a namespaced claim that is absent, blank, or not a string', () => {
    expect(pickDisplayName(claims({ name: 'Standard Name' }), NAMESPACE)).toBe('Standard Name');
    expect(pickDisplayName(claims({ [NAMESPACE]: '   ', name: 'Standard Name' }), NAMESPACE)).toBe(
      'Standard Name'
    );
    expect(pickDisplayName(claims({ [NAMESPACE]: 42, name: 'Standard Name' }), NAMESPACE)).toBe(
      'Standard Name'
    );
  });

  it('trims surrounding whitespace', () => {
    expect(pickDisplayName(claims({ [NAMESPACE]: '  Nina Nordmann  ' }), NAMESPACE)).toBe(
      'Nina Nordmann'
    );
  });

  // The dialog omits the line entirely rather than rendering a blank, so an
  // absent name must be undefined and not an empty string.
  it('returns undefined when no profile or no name claim is present', () => {
    expect(pickDisplayName(undefined, NAMESPACE)).toBeUndefined();
    expect(pickDisplayName(claims({}), NAMESPACE)).toBeUndefined();
    expect(pickDisplayName(claims({ [NAMESPACE]: '' }), NAMESPACE)).toBeUndefined();
  });

  it('works with no namespace configured', () => {
    expect(pickDisplayName(claims({ [NAMESPACE]: 'Nina Nordmann' }))).toBeUndefined();
    expect(pickDisplayName(claims({ name: 'Standard Name' }))).toBe('Standard Name');
  });
});
