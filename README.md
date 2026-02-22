# CampusHub: Enterprise Multi-tenant Library & Study Center OS

CampusHub is a high-fidelity, production-ready management ecosystem designed for modern libraries, co-working spaces, and study centers. It features a hardened multi-tenant architecture and specialized portals for Owners, Staff, and Students.

## 🌟 Product Vision
CampusHub digitizes the physical workspace. We move beyond spreadsheets to provide real-time occupancy telemetry, automated AI billing, and gamified student engagement.

---

## 🚀 Core Ecosystem Segments

### 📊 Executive Command Center (For Library Owners)
- **Financial Telemetry**: High-level KPIs tracking Net Revenue, Operational Burn, and Growth Trends.
- **Dynamic Pricing Engine**: Configure custom rates for tiers (Basic, Standard, Premium) or set specific overrides for high-demand seats.
- **Audit Integrity**: Immutable activity logs providing a forensic-grade record of all facility actions.
- **Ownership Management**: Secure, two-step transfer protocols for institutional handovers.

### 🛠️ Operations Desk (For Library Staff)
- **Live Occupancy Monitor**: Real-time visualization of seat utilization and upcoming transitions.
- **Operational Checklists**: Integrated shift handovers and facility maintenance tracking.
- **Service Queues**: Prioritized management of student print requests and suggestion triage.

### 🎓 Student Success Portal (For Students)
- **Study Companion**: Effortless seat booking with instant AI-generated receipts.
- **Gamified Streaks**: The "Fibonacci Streak" rewards consistent on-time payments with institutional recognition.
- **Feedback Loop**: A direct line to facility management via the digital suggestion box.

### 🛡️ Platform Oversight (For System Admins)
- **Global Telemetry**: Monitor institutional health and platform-wide growth.
- **Infrastructure Health**: Real-time status indicators for database and AI services.

---

## 🔐 Security & Architecture

### Hardened Multi-tenancy
CampusHub uses a **Partitioned Data Model**. Every document is strictly scoped to a `libraryId`. Firestore Security Rules enforce isolation, ensuring that no cross-tenant data leakage occurs.

### Immutable Audit Infrastructure
Financial records (`payments`) and system logs (`activityLogs`) are **immutable**. Once written, they cannot be edited or deleted, ensuring complete institutional accountability.

### Role-Based Access Control (RBAC)
- **Library Owners**: Full financial and administrative oversight.
- **Library Staff**: Operational management (Seating, Printing, Students).
- **Students**: Self-service booking and profile management.

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- **AI Engine**: [Google Genkit](https://github.com/firebase/genkit) with Gemini 2.5 Flash
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Multi-tenant schema)
- **Auth**: [Firebase Auth](https://firebase.google.com/docs/auth) (Hierarchical RBAC)
- **Styling**: Tailwind CSS & [Shadcn UI](https://ui.shadcn.com/)
- **Charts**: Recharts (Custom Indigo/Neutral Theme)

---
Built with ❤️ by the Firebase Studio Team.
