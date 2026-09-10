# Native SEO Intelligence

SEO Intelligence intentionally runs without a third-party SEO data provider.

The server performs bounded public-page inspection through the existing SSRF-protected Web Health request layer. The public UI reports only signals that NecrotixLab can directly observe from fetched HTML and links.

## Available signals

- Technical/on-page/content/indexability/structured-data scoring
- Content-derived keyword and phrase relevance
- Cross-page keyword overlap / cannibalization hints
- User-supplied competitor homepage comparison
- Internal and outbound link analysis
- Generic anchor and nofollow counts
- Bounded broken internal-link checks

## Intentionally unavailable without authoritative external market data

- Google search volume
- CPC
- Live or historical Google rankings
- Estimated organic traffic
- Global backlink counts

The application must not invent or infer those metrics and present them as authoritative values.
