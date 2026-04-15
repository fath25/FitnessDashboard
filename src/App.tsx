import { HashRouter, Routes, Route } from 'react-router-dom'
import { FitnessProvider } from '@/context/FitnessContext'
import { AppShell } from '@/components/layout/AppShell'
import { OverviewDashboard } from '@/components/overview/OverviewDashboard'
import { RunningDashboard } from '@/components/running/RunningDashboard'
import { CyclingDashboard } from '@/components/cycling/CyclingDashboard'
import { SwimmingDashboard } from '@/components/swimming/SwimmingDashboard'
import { StrengthDashboard } from '@/components/strength/StrengthDashboard'
import { BodyDashboard } from '@/components/body/BodyDashboard'
import { TrainingPlanView } from '@/components/training/TrainingPlanView'
import { InsightsDashboard } from '@/components/insights/InsightsDashboard'

export default function App() {
  return (
    <HashRouter>
      <FitnessProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<OverviewDashboard />} />
            <Route path="/running" element={<RunningDashboard />} />
            <Route path="/cycling" element={<CyclingDashboard />} />
            <Route path="/swimming" element={<SwimmingDashboard />} />
            <Route path="/strength" element={<StrengthDashboard />} />
            <Route path="/body" element={<BodyDashboard />} />
            <Route path="/training" element={<TrainingPlanView />} />
            <Route path="/insights" element={<InsightsDashboard />} />
          </Routes>
        </AppShell>
      </FitnessProvider>
    </HashRouter>
  )
}
