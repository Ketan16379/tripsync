-- ============================================================================
-- TripSync Production Database Schema (PostgreSQL 16 + PostGIS 3.4)
-- Migration: V1__init_tripsync_schema.sql
-- Normalized 24-table schema with UUID PKs, FKs, indexes, audit timestamps,
-- soft deletion, and PostGIS geography columns.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(32) NOT NULL DEFAULT 'LOCAL', -- LOCAL, GOOGLE
    provider_id VARCHAR(128),
    role VARCHAR(32) NOT NULL DEFAULT 'USER',           -- USER, TRIP_ADMIN, PLATFORM_ADMIN
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(128),
    password_reset_token VARCHAR(128),
    password_reset_expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;

-- 2. user_profiles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    profile_picture_url TEXT,
    phone_number VARCHAR(32),
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    bio TEXT,
    travel_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. refresh_tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address VARCHAR(64),
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id) WHERE revoked = FALSE;

-- 4. trips
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(180) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    starting_location VARCHAR(255) NOT NULL,
    starting_coords GEOGRAPHY(POINT, 4326),
    destination VARCHAR(255) NOT NULL,
    destination_coords GEOGRAPHY(POINT, 4326),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    trip_type VARCHAR(16) NOT NULL DEFAULT 'GROUP',      -- GROUP, SOLO
    visibility VARCHAR(16) NOT NULL DEFAULT 'PRIVATE',   -- PRIVATE, PUBLIC
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    max_participants INT NOT NULL DEFAULT 15,
    trip_code VARCHAR(16) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',        -- UPCOMING, ACTIVE, COMPLETED, ARCHIVED
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trip_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_max_participants CHECK (max_participants >= 1)
);

CREATE INDEX idx_trips_created_by ON trips(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_trip_code ON trips(trip_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_destination_coords ON trips USING GIST (destination_coords);

-- 5. trip_members
CREATE TABLE trip_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_role VARCHAR(24) NOT NULL DEFAULT 'MEMBER',   -- TRIP_ADMIN, MEMBER
    participation_status VARCHAR(24) NOT NULL DEFAULT 'JOINED', -- JOINED, LEFT, REMOVED
    can_edit_itinerary BOOLEAN NOT NULL DEFAULT TRUE,
    can_invite_members BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, user_id)
);

CREATE INDEX idx_trip_members_trip_user ON trip_members(trip_id, user_id) WHERE participation_status = 'JOINED';

-- 6. trip_invitations
CREATE TABLE trip_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id),
    invitee_email VARCHAR(255),
    invitee_user_id UUID REFERENCES users(id),
    invite_token VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',       -- PENDING, ACCEPTED, REJECTED, EXPIRED
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_invitations_trip ON trip_invitations(trip_id, status);
CREATE INDEX idx_trip_invitations_email ON trip_invitations(invitee_email);

-- 7. trip_activity_logs
CREATE TABLE trip_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,                    -- TRIP_CREATED, MEMBER_JOINED, EXPENSE_ADDED, ITINERARY_UPDATED, etc.
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_activity_logs_trip ON trip_activity_logs(trip_id, created_at DESC);

-- 8. conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. conversation_members
CREATE TABLE conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID,
    last_read_at TIMESTAMPTZ,
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, user_id)
);

-- 10. messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    message_type VARCHAR(32) NOT NULL DEFAULT 'TEXT',    -- TEXT, IMAGE, VIDEO, DOCUMENT, LOCATION, DESTINATION, ITINERARY, EXPENSE
    content TEXT NOT NULL,
    shared_payload JSONB,
    delivery_status VARCHAR(24) NOT NULL DEFAULT 'SENT', -- SENT, DELIVERED, READ
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- 11. message_attachments
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. message_reactions
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, user_id, emoji)
);

-- 13. location_sharing_sessions
CREATE TABLE location_sharing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audience_scope VARCHAR(24) NOT NULL DEFAULT 'ENTIRE_GROUP', -- ENTIRE_GROUP, SELECTED_MEMBERS
    allowed_member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_minutes INT,                                       -- 15, 60, 480, or NULL for until stopped
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ
);

CREATE INDEX idx_location_sessions_active ON location_sharing_sessions(trip_id, user_id) WHERE is_active = TRUE;

-- 14. locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES location_sharing_sessions(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed_mps DOUBLE PRECISION,
    battery_level INT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_trip_user_time ON locations(trip_id, user_id, recorded_at DESC);
CREATE INDEX idx_locations_spatial ON locations USING GIST (coordinates);

-- 15. itinerary_days
CREATE TABLE itinerary_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    itinerary_date DATE NOT NULL,
    title VARCHAR(180) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, day_number)
);

-- 16. itinerary_activities
CREATE TABLE itinerary_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    itinerary_day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    destination_name VARCHAR(255) NOT NULL,
    coordinates GEOGRAPHY(POINT, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    start_time TIME NOT NULL,
    end_time TIME,
    sort_order INT NOT NULL DEFAULT 0,
    category VARCHAR(48) NOT NULL DEFAULT 'SIGHTSEEING', -- TRANSPORT, HOTEL, FOOD, SIGHTSEEING, ADVENTURE
    estimated_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    booking_reference VARCHAR(128),
    notes TEXT,
    image_url TEXT,
    attachment_url TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itinerary_activities_day ON itinerary_activities(itinerary_day_id, sort_order);

-- 17. itinerary_participants
CREATE TABLE itinerary_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES itinerary_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (activity_id, user_id)
);

-- 18. expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    category VARCHAR(48) NOT NULL,                       -- ACCOMMODATION, FOOD, TRANSPORTATION, FUEL, FLIGHTS, TRAIN_TICKETS, ACTIVITIES, SHOPPING, MISCELLANEOUS
    split_method VARCHAR(24) NOT NULL,                   -- EQUAL, EXACT, PERCENTAGE, SHARES, UNEQUAL
    paid_by_user_id UUID NOT NULL REFERENCES users(id),
    expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    receipt_image_url TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_trip ON expenses(trip_id, expense_date DESC) WHERE deleted_at IS NULL;

-- 19. expense_participants
CREATE TABLE expense_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    UNIQUE (expense_id, user_id)
);

-- 20. expense_splits
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owed_amount NUMERIC(15, 2) NOT NULL CHECK (owed_amount >= 0),
    percentage NUMERIC(6, 2),
    share_units INT,
    UNIQUE (expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);

-- 21. settlements
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    payer_user_id UUID NOT NULL REFERENCES users(id),
    payee_user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(24) NOT NULL DEFAULT 'COMPLETED',     -- PENDING, COMPLETED
    payment_method VARCHAR(64) DEFAULT 'MANUAL',
    notes TEXT,
    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_settlement_parties CHECK (payer_user_id <> payee_user_id)
);

CREATE INDEX idx_settlements_trip ON settlements(trip_id, settled_at DESC);

-- 22. notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    category VARCHAR(32) NOT NULL,                       -- TRIP, ITINERARY, CHAT, EXPENSE, LOCATION
    notification_type VARCHAR(64) NOT NULL,
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    dedup_key VARCHAR(180) UNIQUE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, is_read, created_at DESC);

-- 23. notification_preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    trip_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    itinerary_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    chat_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    expense_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    location_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_start TIME DEFAULT '23:00',
    quiet_hours_end TIME DEFAULT '07:00',
    fcm_device_token TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. saved_places
CREATE TABLE saved_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    google_place_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,                       -- DESTINATION, HOTEL, RESTAURANT, ATTRACTION
    formatted_address TEXT,
    coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    rating DOUBLE PRECISION,
    user_ratings_total INT,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, google_place_id)
);

-- 25. uploaded_files
CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'S3',  -- S3, CLOUDINARY
    storage_key VARCHAR(512) NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
