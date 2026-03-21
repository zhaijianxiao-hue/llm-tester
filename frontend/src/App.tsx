import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import ConnectivityTest from './pages/ConnectivityTest'
import PerformanceTest from './pages/PerformanceTest'
import ContextTest from './pages/ContextTest'
import ConfigPage from './pages/ConfigPage'
import ReportsList from './pages/ReportsList'
import ReportDetail from './pages/ReportDetail'
import ChatPage from './pages/ChatPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="test/connectivity" element={<ConnectivityTest />} />
          <Route path="test/performance" element={<PerformanceTest />} />
          <Route path="test/context" element={<ContextTest />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="reports" element={<ReportsList />} />
          <Route path="reports/:id" element={<ReportDetail />} />
        </Route>
        <Route path="/chat/*" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App