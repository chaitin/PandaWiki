package com.chaitin.pandawiki.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

public final class NavDtos {

    private NavDtos() {
    }

    @Data
    @NoArgsConstructor
    public static class CreateReq {
        private String kb_id;
        private String name;
        private Double position;
    }

    @Data
    @NoArgsConstructor
    public static class UpdateReq {
        private String id;
        private String name;
    }
}
