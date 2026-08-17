package com.chaitin.pandawiki.repository

import com.chaitin.pandawiki.entity.SystemSetting
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface SystemSettingRepository : JpaRepository<SystemSetting, Int> {
    fun findByKey(key: String): SystemSetting?
}
