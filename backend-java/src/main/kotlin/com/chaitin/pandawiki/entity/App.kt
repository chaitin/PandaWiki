package com.chaitin.pandawiki.entity

import io.hypersistence.utils.hibernate.type.json.JsonType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.Type
import java.time.OffsetDateTime

@Entity
@Table(name = "apps")
data class App(
    @Id
    @Column(name = "id", nullable = false)
    var id: String? = null,

    @Column(name = "kb_id")
    var kbId: String? = null,

    @Column(name = "name")
    var name: String? = null,

    @Column(name = "type")
    var type: Short? = null,

    @Type(JsonType::class)
    @Column(name = "settings", columnDefinition = "jsonb")
    var settings: Map<String, Any?>? = null,

    @Column(name = "created_at")
    var createdAt: OffsetDateTime? = null,

    @Column(name = "updated_at")
    var updatedAt: OffsetDateTime? = null
)
