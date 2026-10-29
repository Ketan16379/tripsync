package com.tripsync.trip.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trips")
@Tag(name = "Trips & Members", description = "Trip lifecycle, invitations, and role-based member management")
public class TripController {

    @PostMapping
    @Operation(summary = "Create a new group or solo trip")
    public ResponseEntity<Map<String, Object>> createTrip(@Valid @RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "CREATED",
                "tripId", UUID.randomUUID(),
                "payload", request
        ));
    }

    @GetMapping
    @Operation(summary = "List authenticated user's trips with pagination and status filtering")
    public ResponseEntity<Map<String, Object>> listTrips(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(Map.of("page", page, "size", size, "statusFilter", status != null ? status : "ALL"));
    }

    @GetMapping("/{tripId}")
    @PreAuthorize("@tripAuthorizationService.canViewTrip(authentication, #tripId)")
    @Operation(summary = "Get detailed trip information")
    public ResponseEntity<Map<String, Object>> getTrip(@PathVariable UUID tripId) {
        return ResponseEntity.ok(Map.of("tripId", tripId));
    }

    @PutMapping("/{tripId}")
    @PreAuthorize("@tripAuthorizationService.isTripAdmin(authentication, #tripId)")
    @Operation(summary = "Update trip configuration (Trip Admin only)")
    public ResponseEntity<Map<String, Object>> updateTrip(
            @PathVariable UUID tripId,
            @Valid @RequestBody Map<String, Object> request
    ) {
        return ResponseEntity.ok(Map.of("tripId", tripId, "updated", true));
    }

    @DeleteMapping("/{tripId}")
    @PreAuthorize("@tripAuthorizationService.isTripAdmin(authentication, #tripId)")
    @Operation(summary = "Soft-delete a trip (Trip Admin only)")
    public ResponseEntity<Void> deleteTrip(@PathVariable UUID tripId) {
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{tripId}/invitations")
    @PreAuthorize("@tripAuthorizationService.canInvite(authentication, #tripId)")
    @Operation(summary = "Invite members via email or generate shareable invitation token")
    public ResponseEntity<Map<String, Object>> inviteMember(
            @PathVariable UUID tripId,
            @RequestBody Map<String, Object> inviteRequest
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("tripId", tripId, "invitationStatus", "PENDING"));
    }

    @PostMapping("/{tripId}/join")
    @Operation(summary = "Join a trip using a unique trip code or invitation token")
    public ResponseEntity<Map<String, Object>> joinTrip(
            @PathVariable UUID tripId,
            @RequestBody Map<String, String> payload
    ) {
        return ResponseEntity.ok(Map.of("tripId", tripId, "participationStatus", "JOINED"));
    }

    @GetMapping("/{tripId}/members")
    @PreAuthorize("@tripAuthorizationService.canViewTrip(authentication, #tripId)")
    @Operation(summary = "List all active members of a trip with roles and live status")
    public ResponseEntity<Map<String, Object>> getMembers(@PathVariable UUID tripId) {
        return ResponseEntity.ok(Map.of("tripId", tripId));
    }
}
