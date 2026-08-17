package com.chaitin.pandawiki.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public final class KnowledgeBaseDtos {

    private KnowledgeBaseDtos() {
    }

    @Data
    @NoArgsConstructor
    public static class CreateReq {
        private String name;
        private List<String> hosts;
        private List<Integer> ports;
        private List<Integer> ssl_ports;
        private String public_key;
        private String private_key;
    }

    @Data
    @NoArgsConstructor
    public static class UpdateReq {
        private String id;
        private String name;
        private Map<String, Object> access_settings;
    }

    @Data
    @NoArgsConstructor
    public static class Resp {
        private String id;
        private String name;
        private Map<String, Object> access_settings;
        private String perm;
        private OffsetDateTime created_at;
        private OffsetDateTime updated_at;
    }

    @Data
    @NoArgsConstructor
    public static class ReleaseReq {
        private String kb_id;
        private String message;
        private String tag;
        private List<String> node_ids;
    }
}
