# DevOps

The application relies on various deployments and services in order to run. These are all deployed into the government's OpenShift Silver environment.

## Helm Charts

There are helm charts available for each major service / application. Right now they are:


- app (includes web, workers, RPC service for hous-permit-portal)
- anycable-go (websocket service)
- ha-postgres-crunchydb (HA Postgres, makes use of https://github.com/bcgov/crunchy-postgres)
- ha-elasticsearch (HA Elasticsearch based off bitnami/elasticsearch)
- ha-redis (HA Redis with Sentinels based off bitnami/redis)

Run each helm chart by going into the respective folder and issuing helm commands, here are some examples:

### Install Helm Chart (dry run)
`helm install hous-permit-portal . -f values.yaml -f values-dev.yaml -n bfc7dd-dev --debug --dry-run`

### Make updates to the Helm release
`helm upgrade hous-permit-portal -f values.yaml -f values-dev.yaml -n bfc7dd-dev`
