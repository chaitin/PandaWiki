package com.chaitin.pandawiki.repository;

import com.chaitin.pandawiki.entity.Nav;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NavRepository extends JpaRepository<Nav, String> {

    List<Nav> findByKbIdOrderByPositionAsc(String kbId);
}
