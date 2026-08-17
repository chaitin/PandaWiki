package com.chaitin.pandawiki.entity

import io.hypersistence.utils.hibernate.type.json.JsonType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.Type
import java.time.OffsetDateTime

@Entity
@Table(name = "models")
data class Model(
    @Id
    @Column(name = "id", nullable = false)
    var id: String? = null,

    @Column(name = "provider")
    var provider: String? = null,

    @Column(name = "model")
    var model: String? = null,

    @Column(name = "api_key")
    var apiKey: String? = null,

    @Column(name = "api_header")
    var apiHeader: String? = null,

    @Column(name = "base_url")
    var baseUrl: String? = null,

    @Column(name = "api_version")
    var apiVersion: String? = null,

    @Column(name = "type", nullable = false, unique = true)
    var type: String = "chat",

    @Column(name = "is_active")
    var isActive: Boolean? = false,

    @Column(name = "prompt_tokens")
    var promptTokens: Long? = 0,

    @Column(name = "completion_tokens")
    var completionTokens: Long? = 0,

    @Column(name = "total_tokens")
    var totalTokens: Long? = 0,

    @Type(JsonType::class)
    @Column(name = "parameters", columnDefinition = "jsonb")
    var parameters: Map<String, Any?>? = null,

    @Column(name = "created_at")
    var createdAt: OffsetDateTime? = null,

    @Column(name = "updated_at")
    var updatedAt: OffsetDateTime? = null
)
