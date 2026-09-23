import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { SettingsShell } from '@/components/SettingsShell'
import { Dashboard } from '@/pages/Dashboard'
import { Tickets } from '@/pages/Tickets'
import { TicketDetail } from '@/pages/TicketDetail'
import { RolesSection, TeamsSection } from '@/pages/TeamsPermissions'
import { CategoriesSection, CustomFieldsSection, SlaPoliciesSection, TagsSection } from '@/pages/FormFields'

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
          <Route path="sla" element={<SlaPoliciesSection />} />
          <Route path="tags" element={<TagsSection />} />
          <Route path="custom-fields" element={<CustomFieldsSection />} />
        </Route>
        {/* Old bookmarked paths */}
        <Route path="/settings/teams" element={<Navigate to="/teams" replace />} />
        <Route path="/settings/fields" element={<Navigate to="/settings/custom-fields" replace />} />
      </Route>
    </Routes>
  )
}
