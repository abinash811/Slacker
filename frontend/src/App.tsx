import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { SettingsShell } from '@/components/SettingsShell'
import { NotFound } from '@/pages/NotFound'

// Every page is its own chunk, loaded the first time it's visited, so the
// first screen doesn't wait for code from pages the user hasn't opened.
// Layout shows <PageSkeleton> while a page's chunk loads. New pages must be
// added the same way — the bundle budget in CI (scripts/check-bundle.mjs)
// fails the build if the first-load JavaScript grows past its limit.
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Tickets = lazy(() => import('@/pages/Tickets').then((m) => ({ default: m.Tickets })))
const TicketDetail = lazy(() => import('@/pages/TicketDetail').then((m) => ({ default: m.TicketDetail })))
const TeamsSection = lazy(() => import('@/pages/TeamsPermissions').then((m) => ({ default: m.TeamsSection })))
const RolesSection = lazy(() => import('@/pages/TeamsPermissions').then((m) => ({ default: m.RolesSection })))
const CategoriesSection = lazy(() => import('@/pages/FormFields').then((m) => ({ default: m.CategoriesSection })))
const SlaSection = lazy(() => import('@/pages/FormFields').then((m) => ({ default: m.SlaSection })))
const TagsSection = lazy(() => import('@/pages/FormFields').then((m) => ({ default: m.TagsSection })))
const CustomFieldsSection = lazy(() => import('@/pages/FormFields').then((m) => ({ default: m.CustomFieldsSection })))
const Connect = lazy(() => import('@/pages/Connect').then((m) => ({ default: m.Connect })))
const DesignSystem = lazy(() => import('@/pages/DesignSystem').then((m) => ({ default: m.DesignSystem })))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/teams" element={<TeamsSection />} />
        <Route path="/settings" element={<SettingsShell />}>
          <Route index element={<Navigate to="roles" replace />} />
          <Route path="roles" element={<RolesSection />} />
          <Route path="categories" element={<CategoriesSection />} />
          <Route path="sla" element={<SlaSection />} />
          <Route path="tags" element={<TagsSection />} />
          <Route path="custom-fields" element={<CustomFieldsSection />} />
        </Route>
        <Route path="/connect" element={<Connect />} />
        <Route path="/design" element={<DesignSystem />} />
        {/* Old bookmarked paths */}
        <Route path="/settings/teams" element={<Navigate to="/teams" replace />} />
        <Route path="/settings/fields" element={<Navigate to="/settings/custom-fields" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
