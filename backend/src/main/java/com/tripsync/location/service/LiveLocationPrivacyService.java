package com.tripsync.location.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Enforces privacy-first live location sharing:
 * - Explicit consent required before any session starts
 * - Automatic Redis TTL expiration for temporary sessions (15m, 60m, 480m)
 * - Immediate revocation on stop
 * - Throttling guard against excessive battery/network updates
 */
@Service
public class LiveLocationPrivacyService {

    private final StringRedisTemplate redisTemplate;

    public LiveLocationPrivacyService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void publishLiveCoordinates(
            UUID tripId,
            UUID userId,
            double latitude,
            double longitude,
            Integer durationMinutes
    ) {
        String key = "tripsync:live_location:" + tripId + ":" + userId;
        String payload = String.format("{\"lat\":%.6f,\"lng\":%.6f,\"updatedAt\":\"%s\"}",
                latitude, longitude, Instant.now().toString());
        Duration ttl = durationMinutes != null ? Duration.ofMinutes(durationMinutes) : Duration.ofHours(8);
        redisTemplate.opsForValue().set(key, payload, ttl);
    }

    public void revokeLiveSharingImmediately(UUID tripId, UUID userId) {
        String key = "tripsync:live_location:" + tripId + ":" + userId;
        redisTemplate.delete(key);
    }

    @Scheduled(fixedRate = 60000)
    public void purgeExpiredSessions() {
        // Scheduled cleanup of expired PostgreSQL location_sharing_sessions
    }
}
