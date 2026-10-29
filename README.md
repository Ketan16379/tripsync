# TripSync – All-in-One Travel Collaboration Platform

> **"Your Journey. Your People. One Place."**

TripSync unifies **real-time group messaging (WhatsApp)**, **interactive route & live avatar location sharing (Google Maps + Snapchat Maps)**, **collaborative day-wise itinerary planning (Notion)**, **multi-method expense splitting & debt simplification (Splitwise)**, and **destination discovery (Airbnb/Google Places)** into a single responsive web application.

---

## 1. System Architecture

```
+-----------------------------------------------------------------------------------+
|                        React 18 + TypeScript + Vite Frontend                      |
|   Tailwind CSS + Shadcn UI | Zustand | TanStack Query | Recharts | Google Maps    |
+-----------------------------------------+-----------------------------------------+
                                          |
                     HTTPS REST (/api/v1) | WSS STOMP (/ws/tripsync)
                                          v
+-----------------------------------------------------------------------------------+
|                          Spring Boot 3.3 (Java 21) Backend                        |
|  Spring Security (JWT + OAuth2 + RBAC) | Spring WebSocket STOMP | Spring Data JPA |
|  Modules: auth | user | trip | member | chat | location | itinerary | expense     |
|           settlement | notification | discovery | storage | security | common     |
+-------------------+-----------------------------+---------------------------------+
                    |                             |
       JPA / Spatial|                             | Low-Latency Pub/Sub & TTL Keys
                    v                             v
+-----------------------------------+   +-------------------------------------------+
|   PostgreSQL 16 + PostGIS 3.4     |   |                 Redis 7.4                 |
|  24 Normalized Tables (Flyway)    |   |  Live Location Sessions (15m/1h/8h TTL)   |
|  UUID PKs, GIST Spatial Indexes   |   |  Online Presence & Typing Indicators      |
+-----------------------------------+   +-------------------------------------------+
```

---

## 2. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Framer Motion, React Router, TanStack Query, Zustand, React Hook Form, Zod, Recharts
- **Backend:** Java 21, Spring Boot 3.3, Spring Security (BCrypt, JWT Access + Refresh Token Rotation, Google OAuth 2.0), Spring Data JPA / Hibernate Spatial, Spring WebSocket + STOMP, Spring Validation, Spring Scheduler, SpringDoc OpenAPI 3
- **Database & Infrastructure:** PostgreSQL 16 + PostGIS 3.4, Flyway Migrations, Redis 7.4, AWS S3 / Cloudinary, Firebase Cloud Messaging (FCM), Docker & Docker Compose, GitHub Actions CI

---

## 3. Quick Start (Local Development with Docker Compose)

1. Copy the environment variable template:
   ```bash
   cp .env.example .env
   ```
2. Launch PostgreSQL (PostGIS), Redis, Spring Boot Backend, and React Frontend:
   ```bash
   docker compose up --build -d
   ```
3. Access the services:
   - **Frontend Web App:** `http://localhost:5173`
   - **Backend API & Swagger UI:** `http://localhost:8080/swagger-ui.html`
   - **Health Check:** `http://localhost:8080/actuator/health`

---

## 4. Running Automated Tests

- **Backend Unit & Testcontainers Integration Suite:**
  ```bash
  cd backend && mvn clean test
  ```
- **Frontend End-to-End Playwright Suite:**
  ```bash
  cd frontend && npx playwright test
  ```
