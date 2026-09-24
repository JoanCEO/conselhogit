import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ReviewPage from './pages/ReviewPage'
import ProfilePage from './pages/ProfilePage'
import ConvocacoesPage from './pages/ConvocacoesPage'
import LinksPage from './pages/LinksPage'
import AuthPage from './pages/AuthPage'
import JulgamentoPage from './pages/JulgamentoPage'
import MusicReviewPage from './pages/MusicReviewPage'
import MusicPage from './pages/MusicPage'
import NovidadesPage from './pages/NovidadesPage'
import LoadingScreen from './components/LoadingScreen'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user) return <Navigate to="/auth" replace />

  return children
}

export default function App() {
  const { loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>

      <Route
        path="/auth"
        element={<AuthPage />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >

        <Route
          index
          element={<HomePage />}
        />

        <Route
          path="review/:id"
          element={<ReviewPage />}
        />

        <Route
          path="profile/:id"
          element={<ProfilePage />}
        />

        <Route
          path="convocacoes"
          element={<ConvocacoesPage />}
        />

        <Route
          path="links"
          element={<LinksPage />}
        />

        <Route
          path="julgamento"
          element={<JulgamentoPage />}
        />

        <Route
          path="novidades"
          element={<NovidadesPage />}
        />

        <Route
          path="musicas"
          element={<MusicPage />}
        />

        <Route
          path="musica/:id"
          element={<MusicReviewPage />}
        />

      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  )
}