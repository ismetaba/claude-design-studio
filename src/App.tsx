import { Routes, Route, Navigate } from 'react-router-dom';
import GalleryPage from './routes/GalleryPage';
import StudioPage from './routes/StudioPage';
import SettingsPage from './routes/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GalleryPage />} />
      <Route path="/p/:id" element={<StudioPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
