package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.entity.App
import com.chaitin.pandawiki.repository.AppRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.util.UUID

@RestController
@RequestMapping("/api/v1/app")
class AppController(
    private val appRepository: AppRepository
) {

    data class AppDetailResp(
        val id: String?,
        val kb_id: String?,
        val name: String?,
        val type: Short?,
        val settings: Map<String, Any?>?
    )

    data class UpdateAppReq(
        val kb_id: String?,
        val name: String?,
        val settings: Map<String, Any?>?
    )

    private fun ok(data: Any?): Map<String, Any?> = LinkedHashMap<String, Any?>().apply {
        put("success", true)
        put("code", 0)
        put("message", "OK")
        put("data", data)
    }

    private fun err(msg: String): Map<String, Any?> = LinkedHashMap<String, Any?>().apply {
        put("success", false)
        put("code", 40000)
        put("message", msg)
    }

    @GetMapping("/detail")
    fun detail(
        @RequestParam("kb_id") kbId: String,
        @RequestParam("type") type: String
    ): Map<String, Any?> {
        val appType = type.toShortOrNull()
            ?: return err("type 参数格式错误")
        var app = appRepository.findByKbIdAndType(kbId, appType)
        if (app == null) {
            val now = OffsetDateTime.now()
            app = App(
                id = UUID.randomUUID().toString(),
                kbId = kbId,
                name = if (appType == 2.toShort()) "widget 机器人" else null,
                type = appType,
                settings = emptyMap(),
                createdAt = now,
                updatedAt = now
            )
            appRepository.save(app)
        }
        return ok(AppDetailResp(app.id, app.kbId, app.name, app.type, app.settings))
    }

    @PutMapping
    fun update(
        @RequestParam("id") id: String,
        @RequestBody req: UpdateAppReq
    ): Map<String, Any?> {
        val now = OffsetDateTime.now()
        val existing = appRepository.findById(id)
        if (existing.isPresent) {
            val app = existing.get()
            req.kb_id?.let { app.kbId = it }
            req.name?.let { app.name = it }
            req.settings?.let { app.settings = it }
            app.updatedAt = now
            appRepository.save(app)
        } else {
            val appType = req.kb_id?.let { kbId ->
                appRepository.findByKbIdAndType(kbId, 2)?.let { it.type } ?: 2
            } ?: 2
            val app = App(
                id = id,
                kbId = req.kb_id,
                name = req.name,
                type = appType.toShort(),
                settings = req.settings,
                createdAt = now,
                updatedAt = now
            )
            appRepository.save(app)
        }
        return ok("保存成功")
    }
}
