import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { AppProvider } from './state/AppProvider'
import { AppLayout } from './components/AppLayout'
import { RedirectIfSignedIn, RequireOnboarded, RequireSession } from './components/RouteGuards'
import { EmptyState } from './components/EmptyState'
import { ScrollToTop } from './components/ScrollToTop'
import { Welcome } from './pages/onboarding/Welcome'
import { SignUp } from './pages/onboarding/SignUp'
import { ImportSchedule } from './pages/onboarding/ImportSchedule'
import { ReviewSchedule } from './pages/onboarding/ReviewSchedule'
import { Interests } from './pages/onboarding/Interests'
import { Home } from './pages/Home'
import { SetStatus } from './pages/SetStatus'
import { Suggestions } from './pages/Suggestions'
import { CreatePlan } from './pages/CreatePlan'
import { PlanConfirmed } from './pages/PlanConfirmed'
import { PlanDetails } from './pages/PlanDetails'
import { Plans } from './pages/Plans'
import { FreeTime } from './pages/FreeTime'
import { Me } from './pages/Me'
import { EditSchedule } from './pages/EditSchedule'
import { Blocked } from './pages/Blocked'
import { AuthCallback } from './pages/AuthCallback'

function NotFound() {
  return (
    <div className="page">
      <EmptyState
        title="Page not found"
        actions={
          <Link to="/" className="btn btn-primary btn-block">
            Back to home
          </Link>
        }
      >
        That link doesn't go anywhere.
      </EmptyState>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<RedirectIfSignedIn />}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>
          <Route element={<RequireSession />}>
            <Route path="/onboarding/schedule" element={<ImportSchedule />} />
            <Route path="/onboarding/review" element={<ReviewSchedule />} />
            <Route path="/onboarding/interests" element={<Interests />} />
          </Route>
          <Route element={<RequireOnboarded />}>
            <Route element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="/status" element={<SetStatus />} />
              <Route path="/suggestions" element={<Suggestions />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/plans/new" element={<CreatePlan />} />
              <Route path="/plan/:id" element={<PlanDetails />} />
              <Route path="/plan/:id/confirmed" element={<PlanConfirmed />} />
              <Route path="/free-time" element={<FreeTime />} />
              <Route path="/me" element={<Me />} />
              <Route path="/me/schedule" element={<EditSchedule />} />
              <Route path="/me/blocked" element={<Blocked />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
