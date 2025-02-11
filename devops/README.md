# DevOps Guide

This repository contains Helm charts for deploying various services required to run the application within the government's OpenShift environment.

## Helm Charts Overview

The following Helm charts are available for deployment:

- **app** – Deploys the web application, workers, and RPC service for `energy-portal`.  
- **anycable-go** – WebSocket service.  
- **ha-postgres-crunchydb** – High-Availability PostgreSQL using [bcgov/crunchy-postgres](https://github.com/bcgov/crunchy-postgres).  
- **ha-elasticsearch** – High-Availability Elasticsearch based on `bitnami/elasticsearch`.  
- **ha-redis** – High-Availability Redis with Sentinels based on `bitnami/redis`.  
- **configmap** – Stores configuration variables required by the application.  

## Deployment Instructions

Each Helm chart should be deployed in a specific order to ensure proper functionality. Additionally, **ConfigMap values must be set beforehand**, or they will need to be updated later.

### Prerequisites

Ensure you are connected to the OpenShift cluster before proceeding.

### Installation Steps

Navigate to the `helm-charts` directory and run the following command:

```sh
helm install <chart_name> <chart_directory> -f values.yaml -f values-<env>.yaml -n <namespace>
```

Install the charts in the following order:

1. **ha-postgres-crunchydb**  
2. **configmap**  
3. **anycable-go**  
4. **ha-elasticsearch**  
5. **ha-redis**  
6. **app**  
