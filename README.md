# Tadmustum
Starting point for Entur's carpooling test client.

## Tenancy model

The **codespace** (= the baba organisation, = the journey's SIRI `DataSource`) is
the single tenant key across the carpooling pipeline
(tadmustum → nunamnir → subula → nusku), matched byte-for-byte. Codespaces are
never derived from other fields. See
[ADR 0001 in nunamnir](https://github.com/entur/nunamnir/blob/main/docs/adr/0001-the-codespace-is-the-tenant-key.md).
