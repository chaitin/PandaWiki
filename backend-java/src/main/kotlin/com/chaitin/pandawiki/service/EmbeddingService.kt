package com.chaitin.pandawiki.service

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.util.UUID
import kotlin.math.sqrt

/**
 * 向量检索服务（轻量方案，无独立向量数据库）
 *
 * 文档内容通过 embedding 模型转成向量存入 node_embeddings 表（float8[]），
 * 问答时把问题向量化后与知识库所有向量做余弦相似度计算，返回最相关的文档。
 *
 * 数据量小（毕设规模），全量内存计算毫秒级完成；后续数据量大时可替换为 pgvector。
 */
@Service
class EmbeddingService(
    private val jdbcTemplate: JdbcTemplate,
    private val modelService: ModelService
) {

    data class VectorHit(
        val nodeId: String,
        val name: String,
        val content: String,
        val meta: Map<*, *>?,
        val score: Double
    )

    /** 全量重建某个知识库的向量：先删旧向量，再对已发布文档逐个调用 embedding API */
    fun reindexKb(kbId: String): Int {
        jdbcTemplate.update("DELETE FROM node_embeddings WHERE kb_id = ?", kbId)

        val rows = jdbcTemplate.queryForList(
            """SELECT id, name, content, meta FROM nodes
               WHERE kb_id = ? AND status = 2 AND type = 2
               ORDER BY updated_at DESC NULLS LAST""",
            kbId
        )
        if (rows.isEmpty()) return 0

        var count = 0
        for (row in rows) {
            val nodeId = row["id"].toString()
            val content = row["content"] as? String ?: ""
            // 截取前 2000 字符作为向量化文本，控制 token 成本
            val text = content.take(2000)
            if (text.isBlank()) continue

            val vector = modelService.embedding(text)
            insertVector(nodeId, kbId, text, vector)
            count++
        }
        return count
    }

    /**
     * 懒加载增量索引：只给新发布的文档生成向量，同时清理已撤回/删除文档的向量。
     * 避免全量重索引重复调用 embedding API。
     */
    fun ensureIndexed(kbId: String): Boolean {
        val publishedCount = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM nodes WHERE kb_id = ? AND status = 2 AND type = 2",
            Int::class.java,
            kbId
        ) ?: 0
        if (publishedCount == 0) {
            // 没有已发布文档，清空该知识库向量
            jdbcTemplate.update("DELETE FROM node_embeddings WHERE kb_id = ?", kbId)
            return false
        }

        val indexedCount = jdbcTemplate.queryForObject(
            "SELECT count(DISTINCT node_id) FROM node_embeddings WHERE kb_id = ?",
            Int::class.java,
            kbId
        ) ?: 0

        if (publishedCount == indexedCount) return true

        // 1. 只给未向量化的已发布文档生成向量
        val rows = jdbcTemplate.queryForList(
            """SELECT id, name, content, meta FROM nodes
               WHERE kb_id = ? AND status = 2 AND type = 2
                 AND id NOT IN (SELECT DISTINCT node_id FROM node_embeddings WHERE kb_id = ?)
               ORDER BY updated_at DESC NULLS LAST""",
            kbId, kbId
        )
        var count = 0
        for (row in rows) {
            val nodeId = row["id"].toString()
            val content = row["content"] as? String ?: ""
            val text = content.take(2000)
            if (text.isBlank()) continue
            val vector = modelService.embedding(text)
            insertVector(nodeId, kbId, text, vector)
            count++
        }

        // 2. 清理已撤回或删除文档的向量
        jdbcTemplate.update(
            """DELETE FROM node_embeddings
               WHERE kb_id = ?
                 AND node_id NOT IN (
                     SELECT id FROM nodes WHERE kb_id = ? AND status = 2 AND type = 2
                 )""",
            kbId, kbId
        )

        return count > 0 || indexedCount > 0
    }

    /**
     * 对指定节点重新学习：删除旧向量，重新调用 embedding API 生成新向量。
     * 用于 Admin "去学习" 功能，处理之前向量化失败或遗漏的文档。
     */
    fun restudyNodes(kbId: String, nodeIds: List<String>): Int {
        if (nodeIds.isEmpty()) return 0

        jdbcTemplate.update(
            "DELETE FROM node_embeddings WHERE kb_id = ? AND node_id = ANY(?)",
            kbId, nodeIds.toTypedArray()
        )

        val rows = jdbcTemplate.queryForList(
            """SELECT id, name, content, meta FROM nodes
               WHERE kb_id = ? AND status = 2 AND type = 2 AND id = ANY(?)
               ORDER BY updated_at DESC NULLS LAST""",
            kbId, nodeIds.toTypedArray()
        )

        var count = 0
        for (row in rows) {
            val nodeId = row["id"].toString()
            val content = row["content"] as? String ?: ""
            val text = content.take(2000)
            if (text.isBlank()) continue
            val vector = modelService.embedding(text)
            insertVector(nodeId, kbId, text, vector)
            count++
        }
        return count
    }

    /** 向量检索：问题向量与知识库所有向量算余弦相似度，取 topK */
    fun search(kbId: String, query: String, topK: Int = 5): List<VectorHit> {
        val queryVec = modelService.embedding(query)

        data class RowData(
            val nodeId: String,
            val name: String,
            val content: String,
            val meta: Map<*, *>?,
            val vec: DoubleArray
        )

        val rows = jdbcTemplate.query(
            """SELECT e.node_id, n.name, n.content, n.meta, e.embedding
               FROM node_embeddings e
               JOIN nodes n ON n.id = e.node_id
               WHERE e.kb_id = ? AND n.status = 2 AND n.type = 2""",
            { rs, _ ->
                val arr = rs.getArray("embedding").array as Array<*>
                RowData(
                    nodeId = rs.getString("node_id"),
                    name = rs.getString("name"),
                    content = rs.getString("content") ?: "",
                    meta = rs.getObject("meta") as? Map<*, *>,
                    vec = arr.mapNotNull { (it as? Number)?.toDouble() }.toDoubleArray()
                )
            },
            kbId
        )

        return rows.mapNotNull { row ->
            val score = cosineSimilarity(queryVec, row.vec)
            if (score <= 0.0) null
            else VectorHit(row.nodeId, row.name, row.content, row.meta, score)
        }
            .sortedByDescending { it.score }
            .take(topK)
    }

    /** 余弦相似度：两个向量夹角的余弦值，1 表示完全一致，0 表示无关 */
    private fun cosineSimilarity(a: FloatArray, b: DoubleArray): Double {
        if (a.size != b.size || a.isEmpty()) return 0.0
        var dot = 0.0
        var normA = 0.0
        var normB = 0.0
        for (i in a.indices) {
            dot += a[i] * b[i]
            normA += a[i] * a[i]
            normB += b[i] * b[i]
        }
        if (normA == 0.0 || normB == 0.0) return 0.0
        return dot / (sqrt(normA) * sqrt(normB))
    }

    /** 写入一条向量记录，embedding 以 float8[] 数组绑定 */
    private fun insertVector(nodeId: String, kbId: String, text: String, vector: FloatArray) {
        jdbcTemplate.update(
            { conn ->
                val ps = conn.prepareStatement(
                    """INSERT INTO node_embeddings (id, node_id, kb_id, chunk_index, chunk_text, embedding, created_at, updated_at)
                       VALUES (?, ?, ?, 0, ?, ?, now(), now())"""
                )
                ps.setString(1, UUID.randomUUID().toString())
                ps.setString(2, nodeId)
                ps.setString(3, kbId)
                ps.setString(4, text)
                ps.setArray(5, conn.createArrayOf("float8", vector.map { it.toDouble() }.toTypedArray()))
                ps
            }
        )
    }
}
