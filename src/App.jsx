import { Routes, Route, Navigate } from "react-router-dom";
import { useFirebase } from "./context/firebase";
import Login from "./pages/Login";

import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, userData, isLoggedIn, isLoading } = useFirebase();
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

  if (!user) {
    return <Navigate to='/' replace />;
  }
  if (!userData) {
    return <div className='h-screen flex items-center justify-center'>Checking permissions...</div>;
  }
  if (requiredRole && userData.role !== requiredRole) {
    return <Navigate to={userData.role === "admin" ? "/admin" : "/staff"} replace />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Login />} />
      <Route
        path='/staff'
        element={
          <ProtectedRoute requiredRole='staff'>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin'
        element={
          <ProtectedRoute requiredRole='admin'>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
