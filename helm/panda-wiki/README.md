# PandaWiki Helm chart

Deploys [PandaWiki](https://github.com/chaitin/PandaWiki) on Kubernetes: the api,
the consumer, the admin console, the public wiki sites, the Caddy gateway, and the
closed-source raglite/crawler images, plus optionally PostgreSQL, Redis, NATS,
MinIO and Qdrant.

```bash
helm install panda-wiki ./helm/panda-wiki -n panda-wiki --create-namespace
```

Do not run two releases in the same namespace: see [Fixed names](#fixed-names).

## What it deploys

| Component | Kind | Notes |
|---|---|---|
| `panda-wiki-api` | Deployment, port 8000 | Migrations disabled; probes on 8081 |
| `panda-wiki-consumer` | Deployment, 1 replica | Scheduled jobs, no distributed lock |
| `panda-wiki-nginx` | Deployment, port 8080 TLS | Admin SPA and api proxy |
| `panda-wiki-app` | Deployment, port 3010 | Next.js wiki sites |
| `panda-wiki-caddy` | Deployment, 1 replica | Dynamic per-knowledge-base routing |
| `panda-wiki-raglite` | Deployment, port 5050 | RAG service (closed source) |
| `panda-wiki-crawler` | Deployment, port 8080 | Document parser (closed source) |
| `panda-wiki-migrate` | Job | Helm hook, runs before install/upgrade |
| postgres / redis / nats / minio / qdrant | StatefulSet | Optional, see `*.enabled` |

## Configuration

Everything lives in `values.yaml`, which is commented. The parts worth calling
out:

- **Middleware** — each of `postgres`, `redis`, `nats`, `minio`, `qdrant` has an
  `enabled` flag and an `external` block. Setting `enabled: false` requires the
  matching `external.*` addresses, and the chart fails fast if one is missing.
- **Secrets** — leave `secrets.*` empty and the chart generates them on first
  install and keeps them across upgrades, by looking up what it stored earlier.
  Set `secrets.existingSecret` to a Secret you manage instead: it holds
  `jwt-secret` and `admin-password`, plus the middleware keys the enabled
  components read from it (`postgres-password`, `redis-password`,
  `nats-password`, `s3-secret-key`, `qdrant-api-key`). A component with its own
  `auth.existingSecret` takes its password from there instead. The chart validates
  that Secret on install and upgrade whenever it can reach the cluster, and fails
  if a key is missing or if `admin-password` is empty.

  That last check matters because of a silent failure mode: the backend only
  creates the admin account when `ADMIN_PASSWORD` is non-empty, so an empty value
  starts a console with no way in and no error anywhere. A missing key fails
  loudly on its own, the kubelet refuses to start the container.

  The backend also re-applies `ADMIN_PASSWORD` to the admin account on every api
  start, so the value in the Secret wins over a password changed in the console.

  Generation needs a cluster connection to read back what an earlier install
  stored. When the chart is rendered **without** one — `helm template`, Argo CD,
  Flux, `helm lint` with no values — it refuses to invent values instead of
  producing new ones on every render, which would rotate the admin password and
  the JWT secret, and with the bundled middleware the database password too. Pass
  `secrets.existingSecret`, or the individual values, in that case.
- **Backend settings** — `backend.config` is rendered into a `config.yml` mounted
  at `/app/config.yml`. Only settings without an environment variable need to go
  there (the NATS user and the S3 access key are the two that matter); everything
  else is passed as an environment variable so passwords stay in the Secret.

## Fixed names

The backend hardcodes the service names it calls (`panda-wiki-minio`,
`panda-wiki-api`, `panda-wiki-crawler`, `panda-wiki-postgres`,
`panda-wiki-redis`) in its Go source, and the admin nginx proxies to
`panda-wiki-api`. Those Service names are therefore **not** release-scoped, so
one release per namespace is a hard requirement.

## Caddy and entry traffic

Caddy receives the whole routing table from the backend over its admin API and
holds it in memory. Two consequences shape this chart:

1. **Caddy runs a single replica.** The backend pushes config to one instance
   right after it starts and on every knowledge base change, so a second replica
   would serve a stale table.
2. **`caddy.exposure` decides how entry traffic is published.**
   - `hostNetwork` (default) mirrors the official docker compose deployment.
     Caddy binds host ports directly, which is what lets a knowledge base use
     **any port** the admin picks in the console. Cost: the pod is pinned to one
     node, that node is a single point of failure, and `caddy.nodeSelector`
     should be used to choose it deliberately.

     The port has to be free on that node. Caddy starts with no server at all —
     the Caddyfile in the image has every line commented out — so it only binds
     its admin port until the backend pushes a routing table, and a `hostNetwork`
     install therefore succeeds on a node where something else already holds 80
     and 443, such as an ingress controller. What fails instead is publishing a
     knowledge base on a taken port: Caddy rejects the whole configuration rather
     than binding part of it, keeps serving what it had, and the console reports
     the sync failure. Give that knowledge base a free port, or use another
     exposure.
   - `NodePort` / `LoadBalancer` are more cloud-native but only publish the ports
     listed in `caddy.servicePorts` and `caddy.extraPorts`. A knowledge base
     configured on any other port will not be reachable.

   Choose `hostNetwork` unless you know every knowledge base will stay on 80/443.

3. **`caddy.resume` is on by default, and verified.** Caddy keeps its routing
   table in memory and reloads it from its autosave file, so a Caddy-only restart
   no longer loses the routes the backend pushed. Without an autosave file Caddy
   logs `no autosave file exists` and falls back to the Caddyfile baked into the
   image, so a first install still starts. Turn it off only if you want a restart
   to revert to that (empty) Caddyfile.

**The Caddy admin API must not be reachable from outside the cluster.** It
accepts unauthenticated full config writes. The chart keeps its port on a
separate ClusterIP Service so NodePort, LoadBalancer and ClusterIP exposures
never publish it — but `hostNetwork` binds it on the node's own interfaces, and
neither a Service setting nor a NetworkPolicy (traffic arrives through the host
network namespace) can contain that. Use a host firewall, or a non-hostNetwork
exposure, if the node's network is not trusted.

The admin console is a separate entry point from the wiki sites: point an
Ingress at `panda-wiki-nginx`, or use the `ingress.admin` block. The container
terminates TLS itself on 8080, so the Ingress must speak HTTPS to it
(`backend-protocol: HTTPS`, `proxy-ssl-verify: off`).

## Scale and availability

- **`api`** scales horizontally. Sessions live in Redis and the api keeps no
  local state that matters: the `/data` volume only holds a telemetry machine id,
  and telemetry is off by default here.
- **`consumer` must stay at one replica.** Its five scheduled jobs plus a
  startup sync have no distributed lock, so extra replicas repeat them. The chart
  refuses to render `replicaCount > 1`. Implementing
  `consumer.cron.distributedLock` is the prerequisite for raising it.
- **`caddy` is a single point of failure** for all wiki sites, by design above.
- **`raglite`, `qdrant`, `nats`, `postgres`, `redis` and `minio` run as
  single-replica StatefulSets**, which is not a highly available topology. Point
  the chart at managed services through the `external` blocks for production.

## Migrations

The api image's entrypoint runs the migration binary before the api
(`sh -c "/app/panda-wiki-migrate && /app/panda-wiki-api"`). That would make every
pod run migrations on start, so the chart:

- overrides the api command to `/app/panda-wiki-api`, and
- sets `PG_AUTO_MIGRATE=false` / `PG_CREATE_RAGLITE_DB=false` on the api and the
  consumer, and
- runs `panda-wiki-migrate` from a Helm hook job instead, with `workingDir: /app`
  because the migration files are read through the relative path `file://migration`.

The job is a `post-install,pre-upgrade` hook rather than a `pre-install` one: Helm
runs `pre-install` hooks *before* it creates any resource, so on a fresh install
with the bundled middleware the job would wait for PostgreSQL, Redis, NATS and
MinIO that do not exist yet. Running it after the resources are created lets the
job's wait-for-dependencies container cover the gap until they accept connections.

The job waits for PostgreSQL, Redis, NATS and MinIO first: the migration binary
builds its whole dependency graph on startup, so it fails if any of them is
unreachable.

`panda-wiki` also needs the `CREATEDB` privilege to create the `raglite`
database. The bundled PostgreSQL grants it; a managed server usually does not, so
set `postgres.external.createRagliteDB: false` and create the database up front.

## Images must be built from this repository

The published `panda-wiki-api` and `panda-wiki-consumer` images **predate the
backend changes this chart depends on**. Verified against
`chaitin-registry.../chaitin/panda-wiki-api:v3.87.3`: the binary contains none of
`auto_migrate`, `create_raglite_db`, `caddy_admin_listen` or `health.port`, has no
`/healthz` or `/readyz` route, and still dials the Caddy admin API as a **unix
socket** (`caddy-admin.sock`).

What that means in practice, with published images:

| Setting | Effect with a published image |
|---|---|
| `api.probes.mode: http` | Never succeeds: `/healthz` does not exist, so the liveness probe kills the container in a loop. Keep the default `tcp`. |
| `CADDY_API=http://panda-wiki-caddy:2019` | Fails with `dial unix http://panda-wiki-caddy:2019: no such file or directory`, so **publishing a knowledge base fails** with "保存配置失败". The api and Caddy would have to share a unix socket volume instead. |
| `PG_AUTO_MIGRATE`, `PG_CREATE_RAGLITE_DB` | Ignored, so every pod runs migrations on start — the behaviour this chart is designed to avoid. |
| `TELEMETRY_ENABLED`, `INIT_CERT` | Ignored; telemetry stays on and the api still writes a self-signed certificate. |

Build the api and consumer images from this repository to make the above take
effect. `caddy.exposure: hostNetwork` has the same problem from the other side:
it is what compose uses, but the shipped `CADDY_ADMIN` unix socket only works if
the api can see that socket.

## Verified on a real cluster

Checked on a single-node k8s v1.30 cluster, with locally rebuilt api and consumer
images (see above), by a real knowledge base creation driven through the API:

- The routing push works end to end. Caddy's runtime config gained a server on
  `:80` with the knowledge base's host rule plus the default rule, with the
  upstreams taken from `CADDY_UPSTREAM_*` (`panda-wiki-api:8000`,
  `panda-wiki-app:3010`, `panda-wiki-minio:9000`), and `http://<node>:<nodePort>/`
  with the knowledge base's Host header answered 200.
- The `admin` listener survives a full config load: the pushed config restated
  `0.0.0.0:2019` and the admin API kept answering.
- `/healthz` and `/readyz` work, with readiness reporting
  `{"minio":"ok","nats":"ok","postgres":"ok","redis":"ok"}`.
- **The baked `Caddyfile` is the stock template with every line commented out.**
  There is no `admin` directive, which is why `CADDY_ADMIN` takes effect, and no
  site definition, so a fresh Caddy has no routes at all — everything comes from
  the backend's push.
- **`caddy.resume` is safe**, which is why it now defaults to true. With an
  autosave present, a Caddy-only restart keeps the routing table. Without one,
  Caddy logs `no autosave file exists` and falls back to the Caddyfile, so a
  first install still starts.
- **No asset-prefix rewrite is needed.** Next.js emits
  `/panda-wiki-app-assets/_next/static/...` and the standalone server answers all
  of those with 200 through the gateway.
- HTTP health paths exist on two of the closed-source images: raglite answers
  `/health`, qdrant answers `/healthz`, `/readyz` and `/livez`. Crawler answers
  none of the usual paths, so it keeps a TCP probe.
- Migrations run from the hook job (32 tables created), and a knowledge base
  creation reaches raglite, the database and the Caddy push.

### A pre-existing bug this uncovered, now fixed

Deleting the **last** knowledge base used to leave its rule in Caddy:
`SyncKBAccessSettingsToCaddy` returned early when the knowledge base list was
empty, so nothing ever told Caddy to drop that server. Reproduced directly, with
zero rows in `knowledge_bases` and Caddy still holding the deleted knowledge
base's host rule.

It is fixed in the backend — an empty list is now pushed, which is what makes
Caddy drop the removed routes — and verified on the test cluster: creating a
knowledge base adds its server to Caddy and deleting it clears the server list.
The early return had also been hiding an unchecked `kbList[0]`, which needed a
guard of its own once the early return went away.

## Still unverified

- **`/run/pandawiki`**, a host path the official compose file bind-mounts, is not
  mounted here; its purpose is unknown.
- **A knowledge base on a custom port.** Only host rules on the enumerated ports
  were exercised; `NodePort`/`LoadBalancer` exposure cannot publish arbitrary
  ports, and `hostNetwork` was not usable on the test cluster.
- **Multi-replica behaviour.** The api ran at one replica; the distributed lock
  for the consumer's scheduled jobs is still unimplemented by design.
- **Adding an AI model does not register it with raglite.** Creating an embedding
  model through `/api/v1/model` stored it in the panda-wiki database only;
  raglite's own `ai_models` table stayed empty and dataset creation kept failing
  with `no default embedding model available` until a default row was inserted
  there by hand. Whether the console's own model configuration flow does that
  registration was not driven, since it needs a real model credential.

## Verifying a deployment

```bash
helm lint helm/panda-wiki

# Rendering offline cannot generate secrets (see Configuration above), so pass
# them; with a cluster connection helm install/upgrade does not need this.
helm template panda-wiki helm/panda-wiki \
  --set secrets.existingSecret=panda-wiki-secrets |
  kubectl apply --dry-run=server -f -

# everything ready
kubectl -n panda-wiki get pods

# readiness reflects dependencies: stop Redis and this turns 503 without the pod
# being restarted
kubectl -n panda-wiki exec deploy/panda-wiki-api -- wget -qO- localhost:8081/readyz

# streaming survives a rollout: start an AI answer, then
kubectl -n panda-wiki rollout restart deploy/panda-wiki-api

# routes survive a Caddy restart because resume is on by default
kubectl -n panda-wiki delete pod -l app.kubernetes.io/component=caddy

# the Caddy admin API is not reachable from outside the cluster
kubectl -n panda-wiki get svc panda-wiki-caddy-admin -o jsonpath='{.spec.type}'
```

## Requirements

Kubernetes 1.24+ (the chart uses `policy/v1` PodDisruptionBudget), Helm 3.9+.
