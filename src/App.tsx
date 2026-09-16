import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { MusicProvider, SoundProvider } from "./lib/sound";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatWidget from "./components/ChatWidget";
import MusicPlayer from "./components/MusicPlayer";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import StudioPage from "./pages/StudioPage";
import NoviaPage from "./pages/NoviaPage";
import CouturePage from "./pages/CouturePage";
import BijouxPage from "./pages/BijouxPage";
import ArchivePage from "./pages/ArchivePage";
import DossierPage from "./pages/DossierPage";
import DossierHubPage from "./pages/DossierHubPage";
import BrandPage from "./pages/BrandPage";
import ShowcasePage from "./pages/ShowcasePage";
import BillingPage from "./pages/BillingPage";
import BookletPage from "./pages/BookletPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SoundProvider>
          <MusicProvider>
          <div className="pearl-bg flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/showcase/:slug" element={<ShowcasePage />} />
              <Route
                path="/studio"
                element={
                  <ProtectedRoute>
                    <StudioPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/novia"
                element={
                  <ProtectedRoute>
                    <NoviaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/couture"
                element={
                  <ProtectedRoute>
                    <CouturePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bijoux"
                element={
                  <ProtectedRoute>
                    <BijouxPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dossier"
                element={
                  <ProtectedRoute>
                    <DossierHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/atelier"
                element={
                  <ProtectedRoute>
                    <ArchivePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <BillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booklet"
                element={
                  <ProtectedRoute>
                    <BookletPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dossier/:id"
                element={
                  <ProtectedRoute>
                    <DossierPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/maison/:id"
                element={
                  <ProtectedRoute>
                    <BrandPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <ChatWidget />
          <MusicPlayer />
          </div>
          </MusicProvider>
        </SoundProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
