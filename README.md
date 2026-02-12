# CampusHub: Multi-tenant Student & Library Management System

CampusHub is a production-ready, enterprise-grade platform designed for modern libraries, study centers, and co-working spaces. It provides a robust multi-tenant architecture that ensures strict data isolation while offering a comprehensive suite of management tools for both administrators and students.

## 🌟 Vision
CampusHub aims to digitize and optimize every aspect of library management, moving from fragmented spreadsheets to a unified, AI-enhanced ecosystem.

---

## 🚀 Core Features

### 🛠️ For Administrators (Library Owners)

#### 📊 Intelligent Admin Dashboard
- **Real-time KPIs**: Track Total Revenue, Total Expenses, Active Student Count, and New Admissions at a glance.
- **Financial Visualization**: Interactive charts showing 6-month income vs. expense trends.
- **Expense Breakdown**: Categorized pie charts (Rent, Utilities, Supplies, Salaries, Other) for better fiscal control.
- **Activity Feed**: A chronological audit log of all system actions (e.g., student added, payment processed).
- **Report Export**: Generate and download professional PDF reports of the dashboard metrics.

#### 👥 Student CRM & Management
- **Full Lifecycle Tracking**: Manage students through Active, At-Risk, and Inactive statuses.
- **Bulk Operations**: Intelligent archival system that soft-deletes students while cleaning up future bookings and billing records.
- **Interactive Data Table**: Filter students by name, email, or status with multi-column sorting.

#### 🪑 Visual Seating & Room Management
- **Room Designer**: Create multiple rooms with custom capacities.
- **Tiered Pricing**: Define seats as Basic, Standard, or Premium to support variable revenue models.
- **Real-time Seating Plan**: A visual grid showing seat availability for any selected date.
- **Conflict-Aware Booking Engine**: A transaction-safe engine that prevents double-booking of seats or students.

#### 💳 Automated Billing & AI Receipts
- **Dynamic Invoicing**: Bills are automatically generated based on seat tier and booking duration (Hourly, Daily, Monthly, Yearly).
- **AI Receipt Generation**: Powered by **Google Genkit (Gemini 2.5 Flash)**, the system generates professional, monospaced-friendly receipts for every payment.
- **Payment Processing**: Record manual payments and automatically update student payment streaks.

#### 🖨️ Print Request Queue
- **"Print on Desk" Workflow**: Manage student-uploaded documents.
- **Seat-Aware Printing**: Requests automatically identify the student's current seat for direct delivery.
- **Approval System**: Admins can approve or reject requests with specific feedback reasons.

#### 📢 Communication & Feedback
- **Global Announcements**: Broadcast notices to all students.
- **Suggestion Box Management**: Review and update the status of student feedback (New, In Progress, Resolved).

#### ⚙️ Advanced Settings
- **Secure Invites**: Generate unique, time-limited invite codes to onboard students securely.
- **Ownership Transfer**: A secure, two-step process to transfer library administrative rights to another user.

---

### 🎓 For Students

#### 🏠 Student Dashboard
- **Upcoming Bookings**: View current and future seat assignments with precise time slots.
- **Billing Summary**: Track pending dues and overdue notices.
- **Payment Streaks**: A gamified "Fibonacci Streak" system that rewards consistent on-time payments.

#### 📂 Student Services
- **Digital Print Queue**: Upload PDFs/Images directly from the mobile-responsive portal.
- **Feedback Loop**: Submit suggestions to improve facility services.
- **Billing History**: Access and download past invoices.

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & [Shadcn UI](https://ui.shadcn.com/)
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Multi-tenant schema)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth) (Role-Based Access Control)
- **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage) (Secure document handling)
- **AI Engine**: [Google Genkit](https://github.com/firebase/genkit) with Gemini 2.5 Flash
- **Visualization**: [Recharts](https://recharts.org/)
- **Utility**: `date-fns`, `zod`, `react-hook-form`

---

## 🔒 Security & Architecture

### 🛡️ Multi-tenancy
CampusHub utilizes a **Partitioned Data Model**. Every document contains a `libraryId`, and Firestore Security Rules enforce that users can only access data belonging to their specific library. This prevents cross-tenant data leaks.

### 🛂 Role-Based Access Control (RBAC)
- **Library Owners**: Full CRUD access to library resources, financial records, and student data.
- **Students**: Read-only access to library meta-data; restricted access to their own bookings, bills, and profile.

### ⚡ Performance Optimizations
- **Code Splitting**: Heavy libraries like `jspdf` and `html2canvas` are lazy-loaded only when needed.
- **Font Optimization**: Uses `next/font` to eliminate layout shifts (CLS) and improve initial paint times.
- **Memoized References**: Firestore hooks use stable, memoized queries to prevent unnecessary re-renders.

### 🔍 Search Engine Optimization (SEO)
- **Dynamic Metadata**: Fully optimized with Open Graph tags and descriptive page titles.
- **Server-Side Rendering**: Pre-renders the landing page for superior performance and crawlability.

---

## 🚦 Getting Started

### For New Administrators
1. Click **Admin Signup** on the welcome page.
2. Enter your library details and admin credentials.
3. Your isolated library environment will be provisioned instantly.

### For New Students
1. Create a student account via the **Student Signup** link.
2. Enter the **Invite Code** provided by your library administrator.
3. *Demo users can use the code `DEMO` to join the pre-configured demonstration library.*

---

## 🗺️ Roadmap
- [ ] **Multi-language Support**: Native integration for Hindi, Tamil, Telugu, and other Indian languages.
- [ ] **Mobile App**: PWA client for students.
- [ ] **Online Payments**: Integration with UPI and payment gateways.

---
Built with ❤️ by the Firebase Studio Team.