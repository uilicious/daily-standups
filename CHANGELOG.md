# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Standup Timestamps**: Fixed "Invalid Date" display on standup cards by adding a shared date utility (`parseDate`, `formatTime`, `isEdited`) supporting both PostgreSQL ISO strings and SQLite formats.

## [1.0.1] - 2026-09-30

### Fixed
- **Session Authentication in Production**: Enabled `trustProxy` and dynamic session cookie security (`secure: 'auto'`) to prevent `401 Unauthorized` errors when creating teams behind reverse proxies or locally in Docker.

## [1.0.0] - 2026-09-29

### Added
- **Username Authentication & Management**: Added support for logging in via username or email. Seeded initial administrator with username only (`admin`). Required unique username on user creation (immutable once created), and enabled system administrators to update user email addresses.
- **Daily Standups**: Comprehensive standup workflow including daily submissions, team activity feeds with date navigation, blocker highlighting, and Markdown support.
- **Out of Office (OOO) & Schedule Management**: Team availability calendar, individual weekly work schedules, organization-wide working days, and leave tracking with half-day support.
