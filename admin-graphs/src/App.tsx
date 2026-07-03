import { Route, Routes } from "react-router-dom"

import { MetricTrendPage } from "@/pages/metric-trend-page"
import { TrendsDashboard } from "@/pages/trends-dashboard"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<TrendsDashboard />} />
      <Route path="/trends/:metric" element={<MetricTrendPage />} />
    </Routes>
  )
}

export default App
