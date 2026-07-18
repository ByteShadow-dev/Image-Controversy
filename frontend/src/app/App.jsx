import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import EditorPage from '../pages/EditorPage';
import UploadPage from '../pages/UploadPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<UploadPage />} />
        <Route path="editor/:projectId" element={<EditorPage />} />
      </Route>
    </Routes>
  );
}

export default App;
