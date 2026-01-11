import { Routes, Route, Navigate } from "react-router-dom";
import { useFirebase } from "./context/firebase";
import Login from "./pages/Login";

import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";

// --- Protected Route Component ---
const ProtectedRoute = ({ children, requiredRole }) => {
  // We can use useFirebase here because App is wrapped in FirebaseProvider in main.jsx
  const { user, userData, isLoggedIn, isLoading } = useFirebase();

  // 1. Wait for Firebase to finish checking auth
  if (isLoading) {
    return (
      <div className='h-screen w-full flex items-center justify-center bg-gray-50'>
        <div className='animate-pulse flex flex-col items-center'>
          <div className='h-4 w-32 bg-gray-200 rounded mb-2'></div>
          <div className='text-sm text-gray-400'>Loading Time4Work...</div>
        </div>
      </div>
    );
  }

  // 2. If not logged in, redirect to Login
  if (!user) {
    return <Navigate to='/' replace />;
  }

  // 3. If logged in but role data is missing (rare edge case), wait
  if (!userData) {
    return <div className='h-screen flex items-center justify-center'>Checking permissions...</div>;
  }

  // 4. Role Check: If user tries to access Admin but is Staff (or vice versa)
  if (requiredRole && userData.role !== requiredRole) {
    return <Navigate to={userData.role === "admin" ? "/admin" : "/staff"} replace />;
  }

  // 5. Access Granted
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path='/' element={<Login />} />

      {/* Protected Staff Route */}
      <Route
        path='/staff'
        element={
          <ProtectedRoute requiredRole='staff'>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Route */}
      <Route
        path='/admin'
        element={
          <ProtectedRoute requiredRole='admin'>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback Route */}
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
