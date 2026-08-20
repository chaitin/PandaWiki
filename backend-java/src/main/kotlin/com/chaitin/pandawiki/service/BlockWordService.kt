package com.chaitin.pandawiki.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import jakarta.annotation.PostConstruct

/**
 * 敏感词服务：对齐 Go 后端 BlockWordRepo + initDFA
 * 从 settings 表读取 key='block_words' 的记录，初始化 DFA 状态机
 */
@Service
class BlockWordService(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
    private val dfaFilter: DfaFilter
) {

    private val logger = LoggerFactory.getLogger(BlockWordService::class.java)

    companion object {
        const val SETTING_KEY = "block_words"
    }

    data class BlockWords(val words: List<String> = emptyList())

    /**
     * 启动时加载所有知识库的敏感词并初始化 DFA
     */
    @PostConstruct
    fun initAll() {
        try {
            val rows = jdbcTemplate.queryForList(
                "SELECT kb_id, value FROM settings WHERE key = ?", SETTING_KEY
            )
            for (row in rows) {
                val kbId = row["kb_id"] as? String ?: continue
                val words = parseBlockWords(row["value"])
                if (words.isNotEmpty()) {
                    dfaFilter.init(kbId, words)
                    logger.info("Initialized DFA for kbId=$kbId, ${words.size} block words")
                }
            }
        } catch (e: Exception) {
            logger.error("Failed to init block words", e)
        }
    }

    /**
     * 获取指定知识库的屏蔽词列表
     */
    fun getBlockWords(kbId: String): List<String> {
        val row = jdbcTemplate.queryForList(
            "SELECT value FROM settings WHERE kb_id = ? AND key = ?",
            kbId, SETTING_KEY
        ).firstOrNull() ?: return emptyList()

        return parseBlockWords(row["value"])
    }

    /**
     * 刷新指定知识库的 DFA 状态机（管理员更新屏蔽词后调用）
     */
    fun refreshDfa(kbId: String) {
        val words = getBlockWords(kbId)
        dfaFilter.init(kbId, words)
        logger.info("Refreshed DFA for kbId=$kbId, ${words.size} block words")
    }

    /**
     * 检查用户问题是否包含敏感词
     * @return 如果包含敏感词，返回敏感词信息；否则返回 null
     */
    fun checkQuestion(kbId: String, question: String): String? {
        if (!dfaFilter.check(kbId, question)) return null
        return "您的问题包含敏感词, AI 无法回答您的问题。"
    }

    /**
     * 过滤 AI 回答中的敏感词
     */
    fun filterAnswer(kbId: String, answer: String): String {
        return dfaFilter.filter(kbId, answer)
    }

    /**
     * 保存或更新指定知识库的屏蔽词，并刷新 DFA
     */
    fun saveBlockWords(kbId: String, words: List<String>) {
        val filtered = words.filter { it.isNotBlank() }
        val valueJson = objectMapper.writeValueAsString(mapOf("words" to filtered))
        val now = java.time.OffsetDateTime.now()
        val exists = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM settings WHERE kb_id = ? AND key = ?",
            Int::class.java,
            kbId, SETTING_KEY
        ) ?: 0

        if (exists > 0) {
            jdbcTemplate.update(
                "UPDATE settings SET value = ?::jsonb, updated_at = ? WHERE kb_id = ? AND key = ?",
                valueJson, now, kbId, SETTING_KEY
            )
        } else {
            jdbcTemplate.update(
                "INSERT INTO settings (kb_id, key, value, description, created_at, updated_at) VALUES (?, ?, ?::jsonb, ?, ?, ?)",
                kbId, SETTING_KEY, valueJson, "敏感词配置", now, now
            )
        }
        // 刷新内存中的 DFA
        dfaFilter.init(kbId, filtered)
        logger.info("Saved and refreshed DFA for kbId=$kbId, ${filtered.size} block words")
    }

    private fun parseBlockWords(value: Any?): List<String> {
        return try {
            val json = when (value) {
                is String -> value
                is Map<*, *> -> objectMapper.writeValueAsString(value)
                else -> value?.toString() ?: return emptyList()
            }
            val parsed = objectMapper.readValue(json, BlockWords::class.java)
            parsed.words.filter { it.isNotBlank() }
        } catch (e: Exception) {
            logger.warn("Failed to parse block words: ${e.message}")
            emptyList()
        }
    }
}
