package com.chaitin.pandawiki.repository

import com.chaitin.pandawiki.entity.App
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AppRepository : JpaRepository<App, String> {
    fun findByKbIdAndType(kbId: String, type: Short): App?
}
