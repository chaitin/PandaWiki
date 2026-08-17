package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.dto.NavDtos;
import com.chaitin.pandawiki.entity.Nav;
import com.chaitin.pandawiki.repository.NavRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/nav")
@RequiredArgsConstructor
public class NavController {

    private final NavRepository navRepository;

    @GetMapping("/list")
    public List<Nav> list(@RequestParam("kb_id") String kbId) {
        return navRepository.findByKbIdOrderByPositionAsc(kbId);
    }

    @PostMapping({"", "/add"})
    public Nav create(@RequestBody NavDtos.CreateReq req) {
        OffsetDateTime now = OffsetDateTime.now();
        Nav nav = new Nav();
        nav.setId(UUID.randomUUID().toString());
        nav.setKbId(req.getKb_id());
        nav.setName(req.getName());
        nav.setPosition(req.getPosition() != null ? req.getPosition() : 0.0);
        nav.setCreatedAt(now);
        nav.setUpdatedAt(now);
        return navRepository.save(nav);
    }

    @PatchMapping({"/update", ""})
    public Nav update(@RequestBody NavDtos.UpdateReq req) {
        Nav nav = navRepository.findById(req.getId())
                .orElseThrow(() -> new IllegalArgumentException("nav not found"));
        if (req.getName() != null) {
            nav.setName(req.getName());
        }
        nav.setUpdatedAt(OffsetDateTime.now());
        return navRepository.save(nav);
    }

    @DeleteMapping("/delete")
    public Map<String, String> deleteByQuery(@RequestParam("id") String id) {
        navRepository.deleteById(id);
        return Map.of("message", "删除成功");
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteByPath(@PathVariable("id") String id) {
        navRepository.deleteById(id);
        return Map.of("message", "删除成功");
    }
}
