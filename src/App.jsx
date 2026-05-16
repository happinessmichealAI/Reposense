import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Loading from './pages/Loading';
import GraphPage from './pages/GraphPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/graph" element={<GraphPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// Made with Bob
