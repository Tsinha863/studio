# **App Name**: CampusHub

## Core Features:

- Authentication: Secure user authentication with distinct roles (admin, student) using Firebase Authentication.
- Role-Based Routing: Dynamic routing based on user roles (admin, student) to protect routes and provide role-specific dashboards.
- Admin Dashboard: Real-time KPI cards (payments, expenses, student count) and interactive charts for financial and student analytics.
- Student Management (Admin): Full CRUD operations for student records, including search, sort, and modal-based add/edit functionality.
- Financial Management (Admin): Payment history tracking, manual payment creation, and Firestore transaction to update student status and Fibonacci streak.
- Seating Management (Admin): Visual seat grid for assigning/unassigning seats, managing time slots, and handling seat tiering across multiple rooms.
- Personalized Student Portal: Display assigned seat, payment information, Fibonacci streak progress, payment history, and a suggestion box for feedback.
- Generate Simulated Receipts: Generates simulated receipts based on payment details. The tool uses information about the current payment record, student status, and fibonacci streak to generate an appropriate payment.
- Demo Mode: One-click demo mode that seeds Firestore with sample data and logs in to a demo admin account, with a safe reset mechanism.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to evoke trust and intelligence.
- Background color: Light gray (#F0F2F5) to provide a clean and modern backdrop.
- Accent color: Soft purple (#9575CD) to highlight key actions and information.
- Body font: 'PT Sans', a humanist sans-serif for a balance of modernity and warmth.
- Headline font: 'PT Sans', a humanist sans-serif to complement the body text for a consistent feel.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use minimalistic icons from a system library (e.g., Material Design Icons) to ensure consistency.
- Implement a responsive layout with rounded cards and soft shadows to create an Apple-style minimal UI.
- Incorporate subtle animations (e.g., transitions, micro-interactions) to enhance user experience.