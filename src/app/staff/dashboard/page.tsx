
'use client';

import { redirect } from 'next/navigation';

/**
 * Staff Dashboard Redirector
 * Unified with the /admin/dashboard to provide a seamless management experience.
 */
export default function StaffDashboard() {
  // Staff are now routed to the unified admin dashboard which is role-aware.
  redirect('/admin/dashboard');
}
