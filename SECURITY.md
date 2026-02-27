# Security Policy

CampusHub is built with institutional integrity as a core requirement. We employ a multi-layered security strategy to protect student data and financial records.

## Security Architecture

### 1. Data Isolation (Multi-tenancy)
Every request is filtered through a mandatory `libraryId` context. Firestore Security Rules prevent any user from accessing data that does not belong to their specifically provisioned library.

### 2. Immutability
To prevent financial tampering, the following collections are set to "Write-Once":
- `payments`: Once a payment is recorded, it is permanent.
- `activityLogs`: All administrative actions are recorded permanently for audit purposes.

### 3. Role Escalation Prevention
User roles are assigned via a secure onboarding flow. The `admin` (System Admin) role cannot be self-assigned and must be provisioned directly in the backend.

### 4. API Key Safety
All Generative AI operations (Genkit) are executed within **Server Components** or **Server Actions**. API keys are never exposed to the client-side browser.

## Reporting a Vulnerability

If you discover a security vulnerability within CampusHub, please contact our security team immediately.

**Contact**: security@campushub.io

Please do not disclose the vulnerability publicly until it has been resolved. We aim to respond to all reports within 24 hours.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
