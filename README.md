# Carpooling Editor

A testing tool for Entur's carpooling pipeline: a frontend app for creating test carpooling
trips and making the resulting trips available in a journey planner.

## Tenancy model

The **codespace** (= the baba organisation, = the journey's SIRI `DataSource`) is
the single tenant key across the carpooling pipeline
(Carpooling Editor → nunamnir → subula → Carpooling Monitor), matched byte-for-byte.
Codespaces are never derived from other fields. See
[ADR 0001 in nunamnir](https://github.com/entur/nunamnir/blob/main/docs/adr/0001-the-codespace-is-the-tenant-key.md).
