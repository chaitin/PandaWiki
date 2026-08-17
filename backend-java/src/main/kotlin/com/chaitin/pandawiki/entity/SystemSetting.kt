package com.chaitin.pandawiki.entity

import io.hypersistence.utils.hibernate.type.json.JsonType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.Type
import java.time.OffsetDateTime

@Entity
@Table(name = "system_settings")
data class SystemSetting(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(name = "key", nullable = false, unique = true)
    val key: String,

    @Type(JsonType::class)
    @Column(name = "value", columnDefinition = "jsonb", nullable = false)
    var value: Map<String, Any?> = emptyMap(),

    @Column(name = "description")
    var description: String? = null,

    @Column(name = "created_at")
    var createdAt: OffsetDateTime? = null,

    @Column(name = "updated_at")
    var updatedAt: OffsetDateTime? = null
)
