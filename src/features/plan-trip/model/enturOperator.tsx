/**
 * The one operator carpool trips are created with.
 *
 * The form used to fetch the journey planner's full operator list and pick an
 * Entur entry out of it, but only Entur is accepted (see
 * carPoolingTripDataSchema) and the value is dead data downstream, so there is
 * nothing to choose between. Worse, the list is per-environment NeTEx data:
 * staging has no `ENT:` operator at all, so the auto-pick fell back to another
 * codespace's operator and then failed validation in a locked field.
 *
 * Id and name mirror the `ENT:` operator in Entur's NeTEx data.
 */
export const ENTUR_OPERATOR = {
  id: 'ENT:Operator:ENT',
  name: 'Entur',
} as const;
