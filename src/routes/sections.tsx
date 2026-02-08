import { lazy, Suspense } from 'react';
import { Outlet, Navigate, useRoutes } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { varAlpha } from 'src/theme/styles';
import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';
import { useAuth } from 'src/context/AuthContext'; // ✅ Import useAuth
import ProtectedRoute from 'src/components/ProtectedRoute';

// ------------------------------------------c----------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const GuestPage = lazy(() => import('src/pages/guest'));
export const EventPage = lazy(() => import('src/pages/event'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const RegisterPage = lazy(() => import('src/pages/register'));
export const ChangePassword = lazy(() => import('src/pages/change-password'));
export const Profile = lazy(() => import('src/pages/profile'));
export const RsvpPage = lazy(() => import('src/pages/rsvp'));
export const RsvpRespondPage = lazy(() => import('src/pages/rsvp-respond'));
export const RsvpAdminPage = lazy(() => import('src/pages/rsvp-admin'));

export const Page404 = lazy(() => import('src/pages/page-not-found'));

// ----------------------------------------------------------------------

const renderFallback = (
  <Box display="flex" alignItems="center" justifyContent="center" flex="1 1 auto">
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);
export function Router() {
  const { isAuthenticated } = useAuth(); // ✅ Get authentication state
  console.log(isAuthenticated);

  return useRoutes([
    {
      path: '/',
      element: isAuthenticated ? (
        <Navigate to="/home" replace />
      ) : (
        <Navigate to="/sign-in" replace />
      ), // ✅ Redirect to sign-in if not authenticated
    },
    {
      element: (
        <DashboardLayout>
          <Suspense fallback={renderFallback}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      ),
      children: [
        {
          element: <ProtectedRoute />, // ✅ Protect all dashboard routes
          children: [
            { path: 'home', element: <HomePage /> },
            { path: 'event', element: <EventPage /> },

            { path: 'guest', element: <GuestPage /> },
            { path: 'rsvp-admin', element: <RsvpAdminPage /> },
            { path: 'change-password', element: <ChangePassword /> },
            { path: 'profile', element: <Profile /> },
          ],
        },
      ],
    },
    {
      path: 'sign-in',
      element: (
        <AuthLayout>
          <SignInPage />
        </AuthLayout>
      ),
    },
    {
      path: 'sign_up',
      element: (
        <AuthLayout>
          <RegisterPage />
        </AuthLayout>
      ),
    },
    {
      path: 'rsvp/form/:token',
      element: (
        <Suspense fallback={renderFallback}>
          <RsvpPage />
        </Suspense>
      ),
    },
    {
      path: 'rsvp/respond/:rsvpId',
      element: (
        <Suspense fallback={renderFallback}>
          <RsvpRespondPage />
        </Suspense>
      ),
    },
    {
      path: '404',
      element: <Page404 />,
    },

    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);
}
