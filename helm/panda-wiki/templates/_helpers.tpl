{{/*
The application addresses its own components by fixed names (see the note in
values.yaml), so resource names are not release-scoped.
*/}}
{{- define "panda-wiki.name" -}}panda-wiki{{- end -}}

{{- define "panda-wiki.labels" -}}
app.kubernetes.io/name: {{ include "panda-wiki.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: panda-wiki
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "panda-wiki.selectorLabels" -}}
app.kubernetes.io/name: {{ include "panda-wiki.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{/*
Build an image reference from a component's image block, falling back to the
shared tag in .Values.image.tag.
Usage: include "panda-wiki.image" (dict "root" $ "image" .Values.api.image)
*/}}
{{- define "panda-wiki.image" -}}
{{- $registry := .root.Values.global.imageRegistry -}}
{{- $tag := .image.tag | default .root.Values.image.tag -}}
{{- printf "%s/%s:%s" $registry .image.repository $tag -}}
{{- end -}}

{{- define "panda-wiki.imagePullPolicy" -}}
{{- .image.pullPolicy | default .root.Values.image.pullPolicy -}}
{{- end -}}

{{- define "panda-wiki.imagePullSecrets" -}}
{{- with .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}

{{- define "panda-wiki.storageClass" -}}
{{- with .Values.global.storageClass -}}
storageClassName: {{ . | quote }}
{{- end -}}
{{- end -}}

{{/*
Secret holding the credentials: the one the user manages when
secrets.existingSecret is set, otherwise the one the chart generates.
*/}}
{{- define "panda-wiki.secretName" -}}
{{- if .Values.secrets.existingSecret -}}
{{- .Values.secrets.existingSecret -}}
{{- else -}}
{{- printf "%s-secrets" (include "panda-wiki.name" .) -}}
{{- end -}}
{{- end -}}

{{/*
Resolve one generated secret.

Resolution order: the explicit value from values.yaml, then whatever is already
in the cluster (so an upgrade keeps the password the database was initialised
with), then a fresh random value.

This is only called from the Secret template. Every other workload reads the
result through secretKeyRef, because calling it twice would generate two
different random values.

Usage: include "panda-wiki.secretValue" (dict "root" $ "key" "postgres-password" "value" .Values.secrets.postgresPassword)
*/}}
{{- define "panda-wiki.secretValue" -}}
{{- if .value -}}
{{- .value -}}
{{- else -}}
{{- $existing := lookup "v1" "Secret" .root.Release.Namespace (include "panda-wiki.secretName" .root) -}}
{{- $data := dict -}}
{{- if $existing -}}
{{- $data = $existing.data | default dict -}}
{{- end -}}
{{- if hasKey $data .key -}}
{{- index $data .key | b64dec -}}
{{- else -}}
{{- randAlphaNum 40 -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Connection addresses. Each falls back to the in-cluster Service DNS name, which
matches the defaults the backend ships with.
*/}}
{{- define "panda-wiki.postgresHost" -}}
{{- if .Values.postgres.enabled -}}
{{- printf "%s-postgres" (include "panda-wiki.name" .) -}}
{{- else -}}
{{- required "postgres.external.host is required when postgres.enabled is false" .Values.postgres.external.host -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.postgresUser" -}}
{{- if .Values.postgres.enabled -}}
{{- .Values.postgres.auth.username -}}
{{- else -}}
{{- required "postgres.external.username is required when postgres.enabled is false" .Values.postgres.external.username -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.postgresDatabase" -}}
{{- if .Values.postgres.enabled -}}
{{- .Values.postgres.auth.database -}}
{{- else -}}
{{- required "postgres.external.database is required when postgres.enabled is false" .Values.postgres.external.database -}}
{{- end -}}
{{- end -}}

{{/* Secret holding the PostgreSQL password, and the key inside it. */}}
{{- define "panda-wiki.postgresSecretName" -}}
{{- if .Values.postgres.enabled -}}
{{- if .Values.postgres.auth.existingSecret -}}
{{- .Values.postgres.auth.existingSecret -}}
{{- else -}}
{{- include "panda-wiki.secretName" . -}}
{{- end -}}
{{- else if .Values.postgres.external.existingSecret -}}
{{- .Values.postgres.external.existingSecret -}}
{{- else -}}
{{- include "panda-wiki.secretName" . -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.postgresSecretKey" -}}
{{- if .Values.postgres.enabled -}}
{{- if .Values.postgres.auth.existingSecret -}}
password
{{- else -}}
postgres-password
{{- end -}}
{{- else -}}
{{- if .Values.postgres.external.existingSecret -}}
password
{{- else -}}
postgres-password
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.redisAddr" -}}
{{- if .Values.redis.enabled -}}
{{- printf "%s-redis:6379" (include "panda-wiki.name" .) -}}
{{- else -}}
{{- required "redis.external.addr is required when redis.enabled is false" .Values.redis.external.addr -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.redisSecretName" -}}
{{- $custom := "" -}}
{{- if .Values.redis.enabled -}}{{- $custom = .Values.redis.auth.existingSecret -}}{{- else -}}{{- $custom = .Values.redis.external.existingSecret -}}{{- end -}}
{{- if $custom -}}{{- $custom -}}{{- else -}}{{- include "panda-wiki.secretName" . -}}{{- end -}}
{{- end -}}

{{- define "panda-wiki.redisSecretKey" -}}
{{- $custom := "" -}}
{{- if .Values.redis.enabled -}}{{- $custom = .Values.redis.auth.existingSecret -}}{{- else -}}{{- $custom = .Values.redis.external.existingSecret -}}{{- end -}}
{{- if $custom -}}password{{- else -}}redis-password{{- end -}}
{{- end -}}

{{- define "panda-wiki.natsServer" -}}
{{- if .Values.nats.enabled -}}
{{- printf "nats://%s-nats:4222" (include "panda-wiki.name" .) -}}
{{- else -}}
{{- required "nats.external.server is required when nats.enabled is false" .Values.nats.external.server -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.natsUser" -}}
{{- if .Values.nats.enabled -}}
{{- .Values.nats.auth.username -}}
{{- else -}}
{{- .Values.nats.external.username -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.natsSecretName" -}}
{{- $custom := "" -}}
{{- if .Values.nats.enabled -}}{{- $custom = .Values.nats.auth.existingSecret -}}{{- else -}}{{- $custom = .Values.nats.external.existingSecret -}}{{- end -}}
{{- if $custom -}}{{- $custom -}}{{- else -}}{{- include "panda-wiki.secretName" . -}}{{- end -}}
{{- end -}}

{{- define "panda-wiki.natsSecretKey" -}}
{{- $custom := "" -}}
{{- if .Values.nats.enabled -}}{{- $custom = .Values.nats.auth.existingSecret -}}{{- else -}}{{- $custom = .Values.nats.external.existingSecret -}}{{- end -}}
{{- if $custom -}}password{{- else -}}nats-password{{- end -}}
{{- end -}}

{{/* MinIO/S3 object storage used for uploaded files. */}}
{{- define "panda-wiki.s3Endpoint" -}}
{{- if .Values.minio.enabled -}}
{{- printf "%s-minio:9000" (include "panda-wiki.name" .) -}}
{{- else -}}
{{- required "minio.external.endpoint is required when minio.enabled is false" .Values.minio.external.endpoint -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.s3AccessKey" -}}
{{- if .Values.minio.enabled -}}
{{- .Values.minio.auth.accessKey -}}
{{- else -}}
{{- required "minio.external.accessKey is required when minio.enabled is false" .Values.minio.external.accessKey -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.s3SecretName" -}}
{{- $custom := "" -}}
{{- if .Values.minio.enabled -}}{{- $custom = .Values.minio.auth.existingSecret -}}{{- else -}}{{- $custom = .Values.minio.external.existingSecret -}}{{- end -}}
{{- if $custom -}}{{- $custom -}}{{- else -}}{{- include "panda-wiki.secretName" . -}}{{- end -}}
{{- end -}}

{{- define "panda-wiki.s3SecretKey" -}}
{{- $custom := "" -}}
{{- if .Values.minio.enabled -}}{{- $custom = .Values.minio.auth.existingSecret -}}{{- else -}}{{- $custom = .Values.minio.external.existingSecret -}}{{- end -}}
{{- if $custom -}}secretKey{{- else -}}s3-secret-key{{- end -}}
{{- end -}}

{{/* Qdrant is only consumed by raglite. */}}
{{- define "panda-wiki.qdrantHost" -}}
{{- printf "%s-qdrant" (include "panda-wiki.name" .) -}}
{{- end -}}

{{- define "panda-wiki.ragBaseURL" -}}
{{- if .Values.raglite.enabled -}}
{{- printf "http://%s-raglite:%v" (include "panda-wiki.name" .) .Values.raglite.port -}}
{{- else -}}
{{- required "raglite.external.baseURL is required when raglite.enabled is false" .Values.raglite.external.baseURL -}}
{{- end -}}
{{- end -}}

{{/*
host:port forms, used by the migration job's wait-for-dependencies container.
*/}}
{{- define "panda-wiki.postgresAddr" -}}
{{- if .Values.postgres.enabled -}}
{{- printf "%s:5432" (include "panda-wiki.postgresHost" .) -}}
{{- else -}}
{{- printf "%s:%v" (include "panda-wiki.postgresHost" .) .Values.postgres.external.port -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.natsAddr" -}}
{{- if .Values.nats.enabled -}}
{{- printf "%s-nats:4222" (include "panda-wiki.name" .) -}}
{{- else -}}
{{- .Values.nats.external.server | trimPrefix "nats://" | trimPrefix "tls://" -}}
{{- end -}}
{{- end -}}

{{- define "panda-wiki.s3Addr" -}}
{{- include "panda-wiki.s3Endpoint" . -}}
{{- end -}}

{{/*
PostgreSQL DSN. The password is left as $(POSTGRES_PASSWORD) so the value is
expanded by the kubelet from the POSTGRES_PASSWORD variable declared earlier in
the same container's env list, and never appears in the pod spec.
*/}}
{{- define "panda-wiki.pgDsn" -}}
{{- $port := "5432" -}}
{{- $sslMode := "disable" -}}
{{- if not .Values.postgres.enabled -}}
{{- $port = .Values.postgres.external.port | toString -}}
{{- $sslMode = .Values.postgres.external.sslMode -}}
{{- end -}}
{{- printf "host=%s user=%s password=$(POSTGRES_PASSWORD) dbname=%s port=%s sslmode=%s TimeZone=%s" (include "panda-wiki.postgresHost" .) (include "panda-wiki.postgresUser" .) (include "panda-wiki.postgresDatabase" .) $port $sslMode .Values.global.timezone -}}
{{- end -}}
