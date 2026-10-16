# Saved quality findings in call and client analysis

The Overview reads v2 daily/monthly summaries. Call and client pages now read the saved v2 call digest through `/api/digest?callId=...`; this adds no processing or writes to dashboard requests.

The call page has left navigation to existing raw sections and, when the digest is ready, quality check sections. The client retains its layout and gains a Findings tab only when the digest includes that client. Client rows on the call page link directly to that tab.

Read states remain distinct: loading, missing, invalid, unsupported version, and failed storage request. A missing digest does not remove raw analytics. A call digest belonging to a different room or call is rejected by the UI boundary. Storage still uses callId filenames; the producer must ensure the existing uniqueness contract.

## Navigation

- Call findings: `/{room}/{call}#call-findings`.
- Client findings: `/{room}/{call}/{client}#client-overview/findings`.
- Client overview tabs record their selection in the URL fragment and respond to back/forward navigation.
- Evidence opens the relevant existing parent section. Without SFU mappings, producer/consumer destinations resolve to outbound/inbound RTP instead.

Resource IDs and intervals are displayed alongside evidence links. Selecting an exact chart range or resolving a client track ID to a specific SFU row is not implemented; the link intentionally opens the parent instead of guessing that association.

The shared check catalogue supplies questions and section names. Saved outcomes supply applied rules, measurements, units, thresholds, issues, events, assessment coverage, and limitations. No mock data is used as a runtime fallback.

## Checks

`npm run test:digest-navigation` covers read-state preservation, identity mismatch rejection, URL escaping, and evidence destinations. Run it with the existing suite, typecheck and build. Browser verification uses synthetic fixture storage, without production credentials or writes.
