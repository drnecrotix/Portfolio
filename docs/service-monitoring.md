# Service Monitoring scheduler

Recurring customer monitoring is executed by the authenticated internal endpoint:

`POST /api/internal/service-monitoring`

## Required environment value

Set `MONITORING_CRON_SECRET` to a random secret of at least 24 characters in the production environment.

## PlanetHoster cron

Configure a server cron job to call the endpoint periodically. The endpoint itself decides which plans are due, so an hourly cron is sufficient for weekly/monthly plans.

Example command:

```sh
curl -fsS -X POST \
  -H "Authorization: Bearer $MONITORING_CRON_SECRET" \
  https://necrotixlab.com/api/internal/service-monitoring
```

Each scheduler call processes at most three due plans and runs them sequentially to keep the shared N0C workload bounded. A plan must be `ACTIVE` and have reached `nextRunAt` before the scheduler will execute it.

Admin users can run an individual monitoring check manually from Admin > Service Monitoring even when cron is not configured.
