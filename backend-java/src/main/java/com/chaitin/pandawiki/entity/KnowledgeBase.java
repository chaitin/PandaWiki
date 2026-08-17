package com.chaitin.pandawiki.entity;

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
@Table(name = "knowledge_bases")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeBase {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @Column(name = "name")
    private String name;

    @Column(name = "dataset_id")
    private String datasetId;

    @Type(JsonType.class)
    @Column(name = "access_settings", columnDefinition = "jsonb")
    private Map<String, Object> accessSettings;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
