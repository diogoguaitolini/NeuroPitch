import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import SessionView from './pages/SessionView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<Home />} />
        <Route path="/session/:id"    element={<SessionView />} />
      </Routes>
    </BrowserRouter>
  )
}
