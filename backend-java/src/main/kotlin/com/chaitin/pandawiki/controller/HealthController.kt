package com.chaitin.pandawiki.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController {

    @GetMapping("/ping")
    fun ping(): String {
        return "pong"
    }

    @GetMapping("/api/ping")
    fun apiPing(): Map<String, Any> {
        return mapOf(
            "success" to true,
            "message" to "pong"
        )
    }
}
