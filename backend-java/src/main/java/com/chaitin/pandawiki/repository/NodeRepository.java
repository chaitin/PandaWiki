package com.chaitin.pandawiki.repository;

import com.chaitin.pandawiki.entity.Node;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NodeRepository extends JpaRepository<Node, String> {

    List<Node> findByKbId(String kbId);

    List<Node> findByKbIdAndNavId(String kbId, String navId);
}
