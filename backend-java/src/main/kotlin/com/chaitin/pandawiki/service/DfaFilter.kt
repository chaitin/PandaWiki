package com.chaitin.pandawiki.service

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

/**
 * DFA (Deterministic Finite Automaton) 敏感词过滤器
 * 对齐 Go 后端 backend/utils/DFA.go 的功能
 */
@Component
class DfaFilter {

    private val instances = ConcurrentHashMap<String, DfaInstance>()

    /**
     * 初始化指定知识库的 DFA 状态机
     */
    fun init(kbId: String, words: List<String>) {
        if (words.isEmpty()) {
            instances.remove(kbId)
            return
        }
        val root = TrieNode()
        var maxLen = 0
        for (word in words) {
            if (word.isBlank()) continue
            val runes = word.toList()
            maxLen = maxOf(maxLen, runes.size)
            var node = root
            for (r in runes) {
                node = node.children.getOrPut(r) { TrieNode() }
            }
            node.isEnd = true
        }
        instances[kbId] = DfaInstance(Dfa(root), maxLen)
    }

    /**
     * 获取指定知识库的 DFA 实例
     */
    fun get(kbId: String): DfaInstance? = instances[kbId]

    /**
     * 检查文本是否包含敏感词，包含则抛出异常
     */
    fun check(kbId: String, text: String): Boolean {
        val instance = instances[kbId] ?: return false
        return instance.dfa.check(text)
    }

    /**
     * 过滤文本中的敏感词，替换为 🚫
     */
    fun filter(kbId: String, text: String): String {
        val instance = instances[kbId] ?: return text
        return instance.dfa.filter(text)
    }

    /**
     * 获取缓冲区大小（最长敏感词长度），用于流式过滤
     */
    fun getBufferSize(kbId: String): Int {
        return instances[kbId]?.buffSize ?: 0
    }

    data class DfaInstance(val dfa: Dfa, val buffSize: Int)

    class TrieNode {
        val children = mutableMapOf<Char, TrieNode>()
        var isEnd = false
    }

    class Dfa(private val root: TrieNode) {

        /**
         * 检查文本是否包含敏感词
         */
        fun check(text: String): Boolean {
            val runes = text.toList()
            for (i in runes.indices) {
                var node = root
                var j = i
                while (j < runes.size) {
                    val nextNode = node.children[runes[j]] ?: break
                    node = nextNode
                    if (node.isEnd) return true
                    j++
                }
            }
            return false
        }

        /**
         * 过滤文本中的敏感词，替换为 🚫
         */
        fun filter(text: String): String {
            val result = text.toList().toMutableList()
            val replacement = '*'
            for (i in result.indices) {
                var node = root
                var j = i
                while (j < result.size) {
                    val nextNode = node.children[result[j]] ?: break
                    node = nextNode
                    if (node.isEnd) {
                        for (k in i..j) {
                            result[k] = replacement
                        }
                    }
                    j++
                }
            }
            return result.joinToString("")
        }
    }
}
