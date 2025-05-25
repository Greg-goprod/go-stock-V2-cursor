import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Users from './pages/Users';
import Checkouts from './pages/Checkouts';
import Scan from './pages/Scan';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
      <Route path="/equipment" element={<MainLayout><Equipment /></MainLayout>} />
      <Route path="/users" element={<MainLayout><Users /></MainLayout>} />
      <Route path="/checkouts" element={<MainLayout><Checkouts /></MainLayout>} />
      <Route path="/scan" element={<MainLayout><Scan /></MainLayout>} />
      <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
      <Route path="*" element={<MainLayout><Dashboard /></MainLayout>} />
    </Routes>
  );
}

export default App;