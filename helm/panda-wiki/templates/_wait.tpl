{{/*
A wait-for-dependencies init container.

The api, consumer, raglite and crawler all fail hard when a dependency is not
reachable yet: the Go services panic during wiring, and the closed-source raglite
and crawler exit without retrying. Without this they rely on the restart backoff,
which reaches five minutes, so a first install can look broken for a long time.

`addrs` is a space-separated string of host:port values. The api image is used
because it already contains a shell and busybox nc, and it is present on the node
for every deployment that needs this.

Usage: include "panda-wiki.waitForDeps" (dict "root" $ "addrs" "a:1 b:2")
*/}}
{{- define "panda-wiki.waitForDeps" -}}
- name: wait-for-dependencies
  image: {{ include "panda-wiki.image" (dict "root" .root "image" .root.Values.api.image) }}
  imagePullPolicy: {{ include "panda-wiki.imagePullPolicy" (dict "root" .root "image" .root.Values.api.image) }}
  command:
    - sh
    - -c
    - |
      set -eu
      deadline=$(( $(date +%s) + {{ .root.Values.migration.waitTimeoutSeconds }} ))
      for addr in $WAIT_FOR; do
        echo "waiting for ${addr}"
        until nc -z "${addr%:*}" "${addr##*:}"; do
          if [ "$(date +%s)" -ge "$deadline" ]; then
            echo "timed out waiting for ${addr}" >&2
            exit 1
          fi
          sleep 2
        done
        echo "${addr} is reachable"
      done
  env:
    - name: WAIT_FOR
      value: {{ .addrs | quote }}
{{- end -}}

{{/* The dependency addresses each component needs, in host:port form. */}}
{{- define "panda-wiki.postgresNatsRedisMinioAddrs" -}}
{{- include "panda-wiki.postgresAddr" . }} {{ include "panda-wiki.redisAddr" . }} {{ include "panda-wiki.natsAddr" . }} {{ include "panda-wiki.s3Addr" . }}
{{- end -}}

{{- define "panda-wiki.natsMinioAddrs" -}}
{{- include "panda-wiki.natsAddr" . }} {{ include "panda-wiki.s3Addr" . }}
{{- end -}}

{{- define "panda-wiki.postgresQdrantMinioNatsAddrs" -}}
{{- include "panda-wiki.postgresAddr" . }} {{ printf "%s:6333" (include "panda-wiki.qdrantHost" .) }} {{ include "panda-wiki.s3Addr" . }} {{ include "panda-wiki.natsAddr" . }}
{{- end -}}

{{/*
The consumer additionally waits for raglite, because it subscribes to the
raglite.events.doc.update subject. That stream is created by raglite, not by the
backend's own EnsureStreams, and the consumer panics with "no stream matches
subject" if raglite got there first, so waiting for raglite to accept
connections is what keeps it from crash-looping.
*/}}
{{- define "panda-wiki.consumerAddrs" -}}
{{- include "panda-wiki.postgresNatsRedisMinioAddrs" . }}{{- if .Values.raglite.enabled }} {{ printf "%s-raglite:%v" (include "panda-wiki.name" .) .Values.raglite.port }}{{- end }}
{{- end -}}
