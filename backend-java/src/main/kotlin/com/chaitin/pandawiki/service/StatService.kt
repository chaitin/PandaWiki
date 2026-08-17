package com.chaitin.pandawiki.service

import cn.hutool.http.useragent.UserAgentUtil
import com.chaitin.pandawiki.dto.*
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.net.URL
import java.sql.Timestamp
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * 统计聚合服务：对齐 Admin 统计看板所需数据。
 */
@Service
class StatService(
    private val jdbcTemplate: JdbcTemplate
) {

    companion object {
        private val TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    }

    // ---------- 埋点写入 ----------

    fun recordPage(
        kbId: String,
        sessionId: String?,
        userId: String?,
        scene: Int,
        nodeId: String?,
        ip: String,
        ua: String?,
        referer: String?
    ) {
        val browser = parseBrowser(ua)
        val os = parseOs(ua)
        val refererHost = parseRefererHost(referer)

        // users.id 在 Java 后端为 UUID 文本，而 stat_pages.user_id 经 000019 迁移后为 bigint，
        // 两者类型不兼容；埋点时暂将 user_id 置空，避免类型转换异常。
        jdbcTemplate.update(
            """
            INSERT INTO stat_pages
            (kb_id, node_id, user_id, session_id, scene, ip, ua, browser_name, browser_os, referer, referer_host, created_at)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            """.trimIndent(),
            kbId,
            nodeId ?: "",
            sessionId,
            scene,
            ip,
            ua,
            browser,
            os,
            referer,
            refererHost
        )
    }

    // ---------- 汇总统计 ----------

    fun getCount(kbId: String, day: Int): StatCountResp {
        val since = sinceTime(day)

        val pageStats = jdbcTemplate.queryForMap(
            """
            SELECT
                COUNT(DISTINCT ip) AS ip_count,
                COUNT(DISTINCT session_id) AS session_count,
                COUNT(*) AS page_visit_count
            FROM stat_pages
            WHERE kb_id = ? AND created_at >= ?
            """.trimIndent(),
            kbId, since
        )

        val conversationCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM conversations WHERE kb_id = ? AND created_at >= ?",
            Long::class.java,
            kbId, since
        ) ?: 0L

        return StatCountResp(
            ipCount = (pageStats["ip_count"] as Number?)?.toLong() ?: 0L,
            sessionCount = (pageStats["session_count"] as Number?)?.toLong() ?: 0L,
            pageVisitCount = (pageStats["page_visit_count"] as Number?)?.toLong() ?: 0L,
            conversationCount = conversationCount
        )
    }

    // ---------- 实时来访 ----------

    fun getInstantCount(kbId: String): List<InstantCountResp> {
        val rows = jdbcTemplate.queryForList(
            """
            SELECT date_trunc('minute', created_at) AS time_bucket, COUNT(*) AS cnt
            FROM stat_pages
            WHERE kb_id = ? AND created_at >= NOW() - INTERVAL '1 hour'
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
            """.trimIndent(),
            kbId
        )

        val counts = rows.associate {
            val ts = it["time_bucket"] as Timestamp
            val time = ts.toInstant().atOffset(ZoneOffset.UTC).format(TIME_FORMATTER)
            time to ((it["cnt"] as Number?)?.toLong() ?: 0L)
        }.toMutableMap()

        val result = mutableListOf<InstantCountResp>()
        var current = OffsetDateTime.now(ZoneOffset.UTC)
        for (i in 0 until 60) {
            val time = current.format(TIME_FORMATTER)
            result.add(InstantCountResp(time = time, count = counts[time] ?: 0L))
            current = current.minusMinutes(1)
        }
        return result.reversed()
    }

    fun getInstantPages(kbId: String): List<InstantPageResp> {
        val rows = jdbcTemplate.queryForList(
            """
            SELECT id, scene, node_id, user_id, session_id, ip, ua, referer, created_at
            FROM stat_pages
            WHERE kb_id = ?
            ORDER BY created_at DESC
            LIMIT 10
            """.trimIndent(),
            kbId
        )

        val nodeIds = rows.mapNotNull { it["node_id"]?.toString() }.filter { it.isNotBlank() }.distinct()
        val nodeNames = if (nodeIds.isNotEmpty()) {
            val placeholders = nodeIds.joinToString(",") { "?" }
            jdbcTemplate.queryForList(
                "SELECT id, name FROM nodes WHERE id IN ($placeholders)",
                *nodeIds.toTypedArray()
            ).associate { it["id"].toString() to it["name"].toString() }
        } else emptyMap()

        val userIds = rows.mapNotNull { (it["user_id"] as Number?)?.toLong() }.filter { it > 0 }.distinct()
        val userInfos = if (userIds.isNotEmpty()) {
            val placeholders = userIds.joinToString(",") { "?" }
            jdbcTemplate.queryForList(
                "SELECT id, account, avatar FROM users WHERE id IN ($placeholders)",
                *userIds.toTypedArray()
            ).associate {
                (it["id"] as Number).toLong() to UserInfoResp(
                    username = it["account"]?.toString(),
                    avatarUrl = it["avatar"]?.toString()
                )
            }
        } else emptyMap()

        return rows.map { row ->
            val scene = (row["scene"] as Number?)?.toInt()
            val nodeId = row["node_id"]?.toString()
            val nodeName = when (scene) {
                1 -> "欢迎页"
                3 -> "问答页"
                4 -> "登录页"
                else -> nodeNames[nodeId] ?: "-"
            }
            val userId = (row["user_id"] as Number?)?.toLong()
            val ip = row["ip"]?.toString() ?: ""
            InstantPageResp(
                scene = scene,
                nodeId = nodeId,
                nodeName = nodeName,
                ip = ip,
                ipAddress = lookupIp(ip),
                createdAt = formatTime(row["created_at"]),
                userId = userId,
                info = userId?.let { userInfos[it] }
            )
        }
    }

    // ---------- 热门文档 ----------

    fun getHotPages(kbId: String, day: Int): List<HotPageResp> {
        val since = sinceTime(day)
        val rows = jdbcTemplate.queryForList(
            """
            SELECT node_id, COUNT(*) AS cnt
            FROM stat_pages
            WHERE kb_id = ? AND created_at >= ? AND node_id IS NOT NULL AND node_id != ''
            GROUP BY node_id
            ORDER BY cnt DESC
            LIMIT 10
            """.trimIndent(),
            kbId, since
        )

        val nodeIds = rows.map { it["node_id"].toString() }.distinct()
        val nodeNames = if (nodeIds.isNotEmpty()) {
            val placeholders = nodeIds.joinToString(",") { "?" }
            jdbcTemplate.queryForList(
                "SELECT id, name FROM nodes WHERE id IN ($placeholders)",
                *nodeIds.toTypedArray()
            ).associate { it["id"].toString() to it["name"].toString() }
        } else emptyMap()

        return rows.map {
            val nodeId = it["node_id"].toString()
            HotPageResp(
                nodeId = nodeId,
                nodeName = nodeNames[nodeId] ?: nodeId,
                count = (it["cnt"] as Number).toLong()
            )
        }
    }

    // ---------- 来源域名 ----------

    fun getRefererHosts(kbId: String, day: Int): List<HotRefererResp> {
        val since = sinceTime(day)
        return jdbcTemplate.queryForList(
            """
            SELECT referer_host, COUNT(*) AS cnt
            FROM stat_pages
            WHERE kb_id = ? AND created_at >= ? AND referer_host IS NOT NULL AND referer_host != ''
            GROUP BY referer_host
            ORDER BY cnt DESC
            LIMIT 10
            """.trimIndent(),
            kbId, since
        ).map {
            HotRefererResp(
                refererHost = it["referer_host"].toString(),
                count = (it["cnt"] as Number).toLong()
            )
        }
    }

    // ---------- 客户端统计 ----------

    fun getBrowsers(kbId: String, day: Int): HotBrowserResp {
        val since = sinceTime(day)
        val browserRows = jdbcTemplate.queryForList(
            """
            SELECT browser_name AS name, COUNT(*) AS cnt
            FROM stat_pages
            WHERE kb_id = ? AND created_at >= ? AND browser_name IS NOT NULL AND browser_name != ''
            GROUP BY browser_name
            ORDER BY cnt DESC
            LIMIT 10
            """.trimIndent(),
            kbId, since
        )
        val osRows = jdbcTemplate.queryForList(
            """
            SELECT browser_os AS name, COUNT(*) AS cnt
            FROM stat_pages
            WHERE kb_id = ? AND created_at >= ? AND browser_os IS NOT NULL AND browser_os != ''
            GROUP BY browser_os
            ORDER BY cnt DESC
            LIMIT 10
            """.trimIndent(),
            kbId, since
        )

        return HotBrowserResp(
            browser = browserRows.map { BrowserCountResp(it["name"].toString(), (it["cnt"] as Number).toLong()) },
            os = osRows.map { BrowserCountResp(it["name"].toString(), (it["cnt"] as Number).toLong()) }
        )
    }

    // ---------- 地理分布 ----------

    fun getGeoCount(kbId: String, day: Int): Map<String, Long> {
        val since = sinceTime(day)
        val rows = jdbcTemplate.queryForList(
            """
            SELECT ip, COUNT(*) AS cnt
            FROM stat_pages
            WHERE kb_id = ? AND created_at >= ? AND ip IS NOT NULL AND ip != ''
            GROUP BY ip
            """.trimIndent(),
            kbId, since
        )

        val result = mutableMapOf<String, Long>()
        rows.forEach { row ->
            val ip = row["ip"].toString()
            val cnt = (row["cnt"] as Number).toLong()
            val location = lookupIp(ip)
            val key = "${location.country ?: "未知"}|${location.province ?: "未知"}|${location.city ?: "未知"}"
            result[key] = result.getOrDefault(key, 0L) + cnt
        }
        return result
    }

    // ---------- 问答来源分布 ----------

    fun getConversationDistribution(kbId: String, day: Int): List<ConversationDistributionResp> {
        val since = sinceTime(day)
        return jdbcTemplate.queryForList(
            """
            SELECT COALESCE(a.type, 1) AS app_type, COUNT(*) AS cnt
            FROM conversations c
            LEFT JOIN apps a ON c.app_id = a.id
            WHERE c.kb_id = ? AND c.created_at >= ?
            GROUP BY COALESCE(a.type, 1)
            ORDER BY cnt DESC
            """.trimIndent(),
            kbId, since
        ).map {
            ConversationDistributionResp(
                appType = (it["app_type"] as Number?)?.toInt() ?: 1,
                count = (it["cnt"] as Number).toLong()
            )
        }
    }

    // ---------- 热门问题 ----------

    fun getHotQuestions(kbId: String, day: Int): List<HotQuestionResp> {
        val since = sinceTime(day)
        return jdbcTemplate.queryForList(
            """
            SELECT content, COUNT(*) AS cnt
            FROM conversation_messages
            WHERE kb_id = ? AND role = 'user' AND created_at >= ?
              AND content IS NOT NULL AND content != ''
            GROUP BY content
            ORDER BY cnt DESC
            LIMIT 10
            """.trimIndent(),
            kbId, since
        ).map {
            HotQuestionResp(
                question = it["content"].toString(),
                count = (it["cnt"] as Number).toLong()
            )
        }
    }

    // ---------- 工具方法 ----------

    private fun sinceTime(day: Int): OffsetDateTime {
        return OffsetDateTime.now(ZoneOffset.UTC).minusDays(day.toLong())
    }

    private fun formatTime(value: Any?): String? {
        return when (value) {
            is Timestamp -> value.toInstant().toString()
            is OffsetDateTime -> value.toInstant().toString()
            else -> value?.toString()
        }
    }

    private fun parseBrowser(ua: String?): String {
        if (ua.isNullOrBlank()) return "未知"
        return try {
            UserAgentUtil.parse(ua).browser.name
        } catch (e: Exception) {
            "未知"
        }
    }

    private fun parseOs(ua: String?): String {
        if (ua.isNullOrBlank()) return "未知"
        return try {
            UserAgentUtil.parse(ua).os.name
        } catch (e: Exception) {
            "未知"
        }
    }

    private fun parseRefererHost(referer: String?): String {
        if (referer.isNullOrBlank()) return ""
        return try {
            URL(referer).host ?: ""
        } catch (e: Exception) {
            ""
        }
    }

    /**
     * 简易 IP 归属地解析（答辩/演示够用）。
     * 真实生产环境可替换为 ip2region 等离线库。
     */
    fun lookupIp(ip: String): IpAddressResp {
        // 本地/私有网段在演示环境下统一归为北京，确保地图组件有数据可展示；
        // 生产环境接入离线 IP 库后可按真实地址返回。
        if (ip.isBlank() || ip == "127.0.0.1" || ip == "localhost" || ip == "0:0:0:0:0:0:0:1" || ip == "::1") {
            return IpAddressResp(country = "中国", province = "北京市", city = "北京", ip = ip)
        }

        // 私有网段
        if (ip.startsWith("10.") || ip.startsWith("192.168.") ||
            Regex("^172\\.(1[6-9]|2\\d|3[01])\\.").matches(ip)
        ) {
            return IpAddressResp(country = "中国", province = "北京市", city = "北京", ip = ip)
        }

        // 常见公网段示例（可扩展）
        return when {
            ip.startsWith("220.181.") || ip.startsWith("123.125.") || ip.startsWith("111.13.") ->
                IpAddressResp(country = "中国", province = "北京", city = "北京", ip = ip)
            ip.startsWith("101.226.") || ip.startsWith("183.60.") || ip.startsWith("14.17.") || ip.startsWith("113.96.") ->
                IpAddressResp(country = "中国", province = "广东", city = "广州", ip = ip)
            ip.startsWith("101.95.") || ip.startsWith("122.192.") || ip.startsWith("180.163.") || ip.startsWith("116.236.") ->
                IpAddressResp(country = "中国", province = "上海", city = "上海", ip = ip)
            ip.startsWith("112.80.") || ip.startsWith("180.97.") || ip.startsWith("111.206.") ->
                IpAddressResp(country = "中国", province = "河北", city = "保定", ip = ip)
            ip.startsWith("36.110.") || ip.startsWith("39.156.") || ip.startsWith("42.81.") || ip.startsWith("116.25.") ->
                IpAddressResp(country = "中国", province = "浙江", city = "杭州", ip = ip)
            ip.startsWith("58.213.") || ip.startsWith("122.96.") || ip.startsWith("49.64.") || ip.startsWith("218.94.") ->
                IpAddressResp(country = "中国", province = "江苏", city = "南京", ip = ip)
            ip.startsWith("61.135.") || ip.startsWith("119.75.") || ip.startsWith("115.239.") || ip.startsWith("180.149.") ->
                IpAddressResp(country = "中国", province = "北京", city = "北京", ip = ip)
            else -> IpAddressResp(country = "未知", province = "未知", city = "未知", ip = ip)
        }
    }
}
