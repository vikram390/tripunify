import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import SignupPage from './auth/SignupPage'
import AppLayout from './components/AppLayout'
import NotFoundPage from './components/NotFoundPage'
import DashboardPage from './dashboard/DashboardPage'
import JoinTripPage from './dashboard/JoinTripPage'
import NewTripPage from './dashboard/NewTripPage'
import ProfilePage from './profile/ProfilePage'
import JoinPage from './trip-room/JoinPage'
import TripRoomPage from './trip-room/TripRoomPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trips/new" element={<NewTripPage />} />
            <Route path="/join" element={<JoinTripPage />} />
            <Route path="/trips/:tripId" element={<TripRoomPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
