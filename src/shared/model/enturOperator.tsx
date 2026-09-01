/**
 * The operator every carpool trip is published with.
 *
 * The form used to offer an operator picker — first fetched from the journey
 * planner's per-environment operator list, later a locked single-option
 * dropdown — but the value is dead data downstream (Carpooling Editor ->
 * nunamnir -> subula -> Carpooling Monitor, and OTP's CarpoolTrip.provider: no
 * consumer reads it) and only Entur was ever accepted. There was nothing to
 * choose between, and fetching it could fail: staging has no `ENT:` operator in
 * its NeTEx data at all, so the auto-pick fell back to another codespace's
 * operator and then failed validation in a field the user could not correct.
 *
 * So the operatorRef is this constant, unconditionally: no field, no request,
 * nothing that can leave a trip unsaveable.
 *
 * The id mirrors the `ENT:` operator in Entur's NeTEx data.
 */
export const ENTUR_OPERATOR_ID = 'ENT:Operator:ENT';
