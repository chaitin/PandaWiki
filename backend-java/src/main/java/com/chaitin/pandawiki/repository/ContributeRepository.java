package com.chaitin.pandawiki.repository;

import com.chaitin.pandawiki.entity.Contribute;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContributeRepository extends JpaRepository<Contribute, String> {

    Page<Contribute> findByKbIdOrderByCreatedAtDesc(String kbId, Pageable pageable);
}
