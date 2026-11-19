{{/*
Environment shared by the api, the consumer and the migration job.

Usage: include "panda-wiki.backendEnv" (dict "root" $ "role" "api")
role is one of api, consumer, migrate and decides the migration switches: only
the migration job is allowed to touch the schema.
*/}}
{{- define "panda-wiki.backendEnv" -}}
{{- $root := .root -}}
{{- $name := include "panda-wiki.name" $root -}}
{{- $isMigrate := eq .role "migrate" -}}
- name: TZ
  value: {{ $root.Values.global.timezone | quote }}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "panda-wiki.postgresSecretName" $root }}
      key: {{ include "panda-wiki.postgresSecretKey" $root }}
- name: PG_DSN
  value: {{ include "panda-wiki.pgDsn" $root | quote }}
{{- if $isMigrate }}
- name: PG_AUTO_MIGRATE
  value: "true"
{{- if $root.Values.postgres.enabled }}
- name: PG_CREATE_RAGLITE_DB
  value: "true"
{{- else }}
# An external server may not grant CREATEDB; skip creating the raglite database
# and have a DBA create it up front instead.
- name: PG_CREATE_RAGLITE_DB
  value: {{ $root.Values.postgres.external.createRagliteDB | quote }}
{{- end }}
{{- else }}
# Migrations run in the migration job, never from a serving pod.
- name: PG_AUTO_MIGRATE
  value: "false"
- name: PG_CREATE_RAGLITE_DB
  value: "false"
{{- end }}
- name: REDIS_ADDR
  value: {{ include "panda-wiki.redisAddr" $root | quote }}
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "panda-wiki.redisSecretName" $root }}
      key: {{ include "panda-wiki.redisSecretKey" $root }}
- name: MQ_NATS_SERVER
  value: {{ include "panda-wiki.natsServer" $root | quote }}
- name: NATS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "panda-wiki.natsSecretName" $root }}
      key: {{ include "panda-wiki.natsSecretKey" $root }}
- name: S3_ENDPOINT
  value: {{ include "panda-wiki.s3Endpoint" $root | quote }}
- name: S3_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "panda-wiki.s3SecretName" $root }}
      key: {{ include "panda-wiki.s3SecretKey" $root }}
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "panda-wiki.secretName" $root }}
      key: jwt-secret
- name: RAG_CT_RAG_BASE_URL
  value: {{ include "panda-wiki.ragBaseURL" $root | quote }}
{{- if $root.Values.caddy.enabled }}
# The admin Service is ClusterIP regardless of how entry traffic is published,
# so the unauthenticated admin API is never exposed outside the cluster.
- name: CADDY_API
  value: {{ printf "http://%s-caddy-admin:%v" $name $root.Values.caddy.adminPort | quote }}
- name: CADDY_ADMIN_LISTEN
  value: {{ printf "0.0.0.0:%v" $root.Values.caddy.adminPort | quote }}
- name: CADDY_UPSTREAM_API
  value: {{ printf "%s-api:%v" $name $root.Values.api.port | quote }}
- name: CADDY_UPSTREAM_APP
  value: {{ printf "%s-app:%v" $name $root.Values.app.port | quote }}
- name: CADDY_UPSTREAM_STATIC
  value: {{ include "panda-wiki.s3Endpoint" $root | quote }}
{{- end }}
- name: TELEMETRY_ENABLED
  value: {{ $root.Values.backend.telemetry.enabled | quote }}
- name: INIT_CERT
  value: {{ $root.Values.backend.setup.initCert | quote }}
- name: SENTRY_ENABLED
  value: {{ $root.Values.backend.sentry.enabled | quote }}
{{- with $root.Values.backend.sentry.dsn }}
- name: SENTRY_DSN
  value: {{ . | quote }}
{{- end }}
{{- if eq .role "api" }}
- name: ADMIN_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "panda-wiki.secretName" $root }}
      key: admin-password
{{- end }}
{{- end -}}

{{/*
Volume mounts and volumes shared by the api, the consumer and the migration job.

The api writes a self-signed certificate and a telemetry machine id under these
paths when their switches are on. Both are disabled by default in this chart, but
an emptyDir keeps a pod from failing to start if one is re-enabled.
*/}}
{{- define "panda-wiki.backendVolumes" -}}
- name: data
  emptyDir: {}
- name: config
  configMap:
    name: {{ include "panda-wiki.name" . }}-config
{{- end -}}

{{- define "panda-wiki.backendVolumeMounts" -}}
- name: data
  mountPath: /data
- name: config
  mountPath: /app/config.yml
  subPath: config.yml
{{- end -}}
