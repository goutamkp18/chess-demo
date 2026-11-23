import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard component:
 * 1. Checks if authenticated user has incomplete onboarding; redirects to /register.
 * 2. Requires authenticated user; redirects to /login if unauthenticated.
 * 3. If allowedRoles list is provided, checks if user.role is in allowedRoles;
 *    if not allowed, redirects to /forbidden (friendly 403 page).
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isLoggedIn, user, needsOnboarding, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#0b0b0c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e8c27a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Force onboarding completion for first-time OAuth or uncompleted profiles
  if (needsOnboarding) {
    return <Navigate to="/register" replace />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.toUpperCase();
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
