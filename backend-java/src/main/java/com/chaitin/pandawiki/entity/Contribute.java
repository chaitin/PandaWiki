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
@Table(name = "contributes")
@Getter
@Setter
@NoArgsConstructor
public class Contribute {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @JsonProperty("auth_id")
    @Column(name = "auth_id")
    private Long authId;

    @JsonProperty("kb_id")
    @Column(name = "kb_id", nullable = false)
    private String kbId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "type", nullable = false)
    private String type;

    @JsonProperty("node_id")
    @Column(name = "node_id")
    private String nodeId;

    @Column(name = "name")
    private String name;

    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "reason", nullable = false)
    private String reason;

    @JsonProperty("audit_user_id")
    @Column(name = "audit_user_id", nullable = false)
    private String auditUserId;

    @JsonProperty("audit_time")
    @Column(name = "audit_time")
    private OffsetDateTime auditTime;

    @JsonProperty("remote_ip")
    @Column(name = "remote_ip", nullable = false)
    private String remoteIp;

    @Type(JsonType.class)
    @Column(name = "meta", columnDefinition = "jsonb")
    private Map<String, Object> meta;

    @JsonProperty("created_at")
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @JsonProperty("updated_at")
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
