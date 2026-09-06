# Experimentation methodology

NecrotixLab uses small first-party A/B experiments to compare specific presentation and navigation choices. The experimentation layer is intentionally narrower than a general product-analytics platform: it focuses on randomized homepage variants, session-level outcome measurement and transparent decision support.

## Measurement unit

The statistical unit is a browser experiment session, not a page load and not a named person.

- Variant assignment is kept stable in the `necrotix_experiment_variants` session cookie.
- `necrotix_experiment_session` is a separate random HTTP-only session cookie used for measurement deduplication.
- The server stores only a one-way hash of the experiment-session cookie in `ExperimentSessionEvent`.
- A specific event is counted at most once for an experiment and browser session.
- If an outcome arrives before its exposure event, the server records the matching exposure first so the conversion denominator remains internally consistent.
- Likely bots and requests with `DNT: 1` are excluded from experiment telemetry.

This design prevents refreshes and repeated component mounts from artificially increasing the statistical sample.

## Variant allocation

Each current experiment defines its expected A/B allocation explicitly. The current tests use 50/50 assignment.

The dashboard performs a Sample Ratio Mismatch check. An SRM warning means the observed allocation is unlikely under the configured split and the experiment should be treated as a data-quality problem before its conversion result is interpreted.

The current SRM warning threshold is `p < 0.01`.

## Primary metric

Every experiment has one primary metric chosen before the result is evaluated. Statistical decision states are based on that primary metric.

For both variants the conversion rate is:

`unique sessions with primary outcome / unique exposed sessions`

The dashboard reports:

- conversion rate for A and B
- 95% Wilson confidence interval for each rate
- absolute B-vs-A percentage-point difference
- relative lift when the control rate is non-zero
- two-sided two-proportion p-value
- 95% confidence interval for the absolute difference

A primary result is treated as statistically significant when `p < 0.05` and the 95% difference interval is entirely on one side of zero.

## Minimum evaluation sample

Statistical significance alone is not used to promote very small samples into a rollout decision. Each experiment defines a minimum exposed-session count per variant.

Before both variants reach that minimum the dashboard reports `Keep collecting`, even if an early difference looks large.

These minimums are practical evaluation guardrails, not formal prospective power calculations.

## Secondary metrics

Secondary metrics are shown as guardrails. They help answer whether an apparent improvement in the primary metric is accompanied by an undesirable change elsewhere.

A secondary metric can strengthen or weaken confidence in a product decision, but it does not silently replace the pre-selected primary metric.

## Decision states

The dashboard uses the following states:

- `Keep collecting` - at least one variant is below the configured minimum sample.
- `Check data quality` - the allocation fails the SRM check after enough traffic exists to make the warning meaningful.
- `Primary metric favors B` - the primary metric has a statistically reliable positive B-vs-A difference.
- `Primary metric favors A` - the treatment has a statistically reliable negative effect on the primary metric.
- `No clear difference` - the minimum sample has been reached but the result remains statistically inconclusive.

These labels are decision support. They do not imply that every significant result should automatically be shipped.

## Concurrent experiments

The current homepage experiments can run concurrently. Their assignments are independent. Because the system is deliberately lightweight, it does not currently estimate interaction effects between experiments. When two tests alter closely related UI behavior, results should be interpreted with that limitation in mind.

## Clean-sample boundary

Statistics in v1.2.24 use only `ExperimentSessionEvent` rows created by the new deduplicated measurement layer. Older `ExperimentMetric` counters remain for backwards compatibility but are not mixed into confidence intervals, SRM checks or decision states because older counters could contain repeated browser events.

## Retention and privacy

Deduplicated experiment-session rows are intended to remain for up to about 31 days. They contain:

- experiment ID
- hashed session reference
- variant
- event name
- timestamp

They do not contain a visitor name, email address, raw IP address, city or precise coordinates. Aggregate counters can remain separately for longitudinal totals without retaining the experiment-session hash.
