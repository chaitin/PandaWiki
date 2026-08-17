package com.chaitin.pandawiki.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "nodes")
@Getter
@Setter
@NoArgsConstructor
public class Node {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @JsonProperty("kb_id")
    @Column(name = "kb_id")
    private String kbId;

    @JsonProperty("nav_id")
    @Column(name = "nav_id")
    private String navId;

    @Column(name = "type")
    private Short type;

    @Column(name = "status")
    private Short status;

    @Column(name = "name")
    private String name;

    @Column(name = "content")
    private String content;

    @Type(JsonType.class)
    @Column(name = "meta", columnDefinition = "jsonb")
    private Map<String, Object> meta;

    @JsonProperty("parent_id")
    @Column(name = "parent_id")
    private String parentId;

    @Column(name = "position")
    private Double position;

    @JsonProperty("doc_id")
    @Column(name = "doc_id")
    private String docId;

    @JsonProperty("creator_id")
    @Column(name = "creator_id")
    private String creatorId;

    @JsonProperty("editor_id")
    @Column(name = "editor_id")
    private String editorId;

    @JsonProperty("edit_time")
    @Column(name = "edit_time")
    private OffsetDateTime editTime;

    @Type(JsonType.class)
    @Column(name = "permissions", columnDefinition = "jsonb")
    private Map<String, Object> permissions;

    @JsonProperty("rag_info")
    @Type(JsonType.class)
    @Column(name = "rag_info", columnDefinition = "jsonb")
    private Map<String, Object> ragInfo;

    @JsonProperty("created_at")
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @JsonProperty("updated_at")
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
