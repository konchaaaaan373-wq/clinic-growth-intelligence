import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./routes/HomePage";
import AuditPage from "./routes/AuditPage";
import ResultsPage from "./routes/ResultsPage";
import SamplePage from "./routes/SamplePage";
import AboutMMMPage from "./routes/AboutMMMPage";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/sample" element={<SamplePage />} />
          <Route path="/about-mmm" element={<AboutMMMPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
