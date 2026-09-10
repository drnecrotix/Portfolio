# Service Monitoring scheduler

Recurring customer monitoring is executed by the authenticated internal endpoint:

`POST /api/internal/service-monitoring`

## Scheduler credential

A separate `MONITORING_CRON_SECRET` is optional.

- If `MONITORING_CRON_SECRET` contains at least 24 characters, the scheduler continues to use it directly for backward compatibility.
- Otherwise the application derives a dedicated, scoped HMAC scheduler token from the first available server credential: `INTEGRATION_CREDENTIALS_SECRET`, `AI_CREDENTIALS_SECRET`, or `AUTH_SECRET`.
- The derived token does not expose the underlying server credential and cannot be used as an Auth.js session secret.
- Rotating the underlying server credential also rotates the derived scheduler token, so the cron command must be copied again afterward.

Admin > Service Monitoring reports whether a scheduler credential is available and provides a copyable PlanetHoster cron command with the correct bearer token.

## PlanetHoster cron

Configure a server cron job to call the endpoint periodically. The endpoint itself decides which plans are due, so an hourly cron is sufficient for weekly/monthly plans.

Use the command provided by Admin > Service Monitoring. Its shape is:

```sh
curl -fsS -X POST \
  -H "Authorization: Bearer <scheduler-token>" \
  "https://necrotixlab.com/api/internal/service-monitoring"
```

Each scheduler call processes at most three due plans and runs them sequentially to keep the shared N0C workload bounded. A plan must be `ACTIVE` and have reached `nextRunAt` before the scheduler will execute it.

Admin users can run an individual monitoring check manually from Admin > Service Monitoring even when server cron is not configured.
