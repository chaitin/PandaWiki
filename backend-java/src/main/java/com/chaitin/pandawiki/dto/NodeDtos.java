package com.chaitin.pandawiki.dto;

import com.chaitin.pandawiki.entity.Node;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public final class NodeDtos {

    private NodeDtos() {
    }

    @Data
    @NoArgsConstructor
    public static class CreateReq {
        private String kb_id;
        private String nav_id;
        private String parent_id;
        private Short type;
        private String name;
        private String content;
        private String summary;
        private String emoji;
        private String content_type;
        private Double position;
    }

    @Data
    @NoArgsConstructor
    public static class UpdateReq {
        private String id;
        private String kb_id;
        private String name;
        private String content;
        private String emoji;
        private String summary;
        private String content_type;
        private Double position;
        private String nav_id;
    }

    @Data
    @NoArgsConstructor
    public static class ActionReq {
        private String action;
        private List<String> ids;
        private String kb_id;
    }

    @Data
    @NoArgsConstructor
    public static class MoveReq {
        private String id;
        private String kb_id;
        private String next_id;
        private String parent_id;
        private String prev_id;
    }

    @Data
    @NoArgsConstructor
    public static class MoveNavReq {
        private List<String> ids;
        private String kb_id;
        private String nav_id;
    }

    @Data
    @NoArgsConstructor
    public static class RestudyReq {
        private String kb_id;
        private List<String> node_ids;
    }

    @Data
    @NoArgsConstructor
    public static class GroupNavResp {
        private String nav_id;
        private String nav_name;
        private Double position;
        private Long count;
        private List<Node> list;
    }

    @Data
    @NoArgsConstructor
    public static class SummaryReq {
        private List<String> ids;
        private String kb_id;
    }
}
