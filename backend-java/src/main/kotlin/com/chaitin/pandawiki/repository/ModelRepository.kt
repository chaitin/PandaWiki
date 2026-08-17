package com.chaitin.pandawiki.repository

import com.chaitin.pandawiki.entity.Model
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ModelRepository : JpaRepository<Model, String> {
    fun findByType(type: String): Model?
    fun findByTypeAndIsActiveTrue(type: String): Model?
}
