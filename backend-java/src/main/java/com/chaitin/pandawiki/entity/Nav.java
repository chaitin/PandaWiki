package com.chaitin.pandawiki.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "navs")
@Getter
@Setter
@NoArgsConstructor
public class Nav {

    @Id
    @Column(name = "id", nullable = false)
    private String id;

    @Column(name = "name", nullable = false)
    private String name;

    @JsonProperty("kb_id")
    @Column(name = "kb_id", nullable = false)
    private String kbId;

    @Column(name = "position")
    private Double position;

    @JsonProperty("created_at")
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @JsonProperty("updated_at")
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
