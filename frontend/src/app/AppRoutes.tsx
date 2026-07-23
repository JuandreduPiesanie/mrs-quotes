import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import type { Role } from './roles';
import { getRoleCapabilities } from './roles';
import { useGetAppointmentsQuery, useGetQuoteQuery } from '../services/baseApi';
import type { AppointmentDto, QuoteDto } from '../services/apiDtos';
import type { QuoteAppointmentContext } from '../features/quotes/domain/quoteTypes';

const CalendarView = lazy(() => import('../features/calendar/CalendarPage').then((module) => ({ default: module.CalendarView })));
const AssignmentsView = lazy(() => import('../features/assignments/AssignmentsPage').then((module) => ({ default: module.AssignmentsView })));
const QuoteBuilder = lazy(() => import('../features/quotes/QuoteBuilderPage').then((module) => ({ default: module.QuoteBuilder })));
const QuotesView = lazy(() => import('../features/quotes/QuotesPage').then((module) => ({ default: module.QuotesView })));
const ScheduleView = lazy(() => import('../features/scheduling/SchedulePage').then((module) => ({ default: module.ScheduleView })));
const UsersView = lazy(() => import('../features/users/UsersPage').then((module) => ({ default: module.UsersView })));

interface AppRoutesProps {
  role: Role;
}

export function AppRoutes({ role }: AppRoutesProps) {
  const capabilities = getRoleCapabilities(role);

  return (
    <Suspense fallback={<div className="empty">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route path="/calendar" element={<CalendarRoute role={role} />} />
        <Route path="/quotes" element={<RouteGuard allowed={capabilities.canViewQuotes}><QuotesRoute role={role} /></RouteGuard>} />
        <Route path="/quotes/:quoteId" element={<RouteGuard allowed={capabilities.canViewQuotes}><QuotesRoute role={role} /></RouteGuard>} />
        <Route path="/quotes/:quoteId/edit" element={<RouteGuard allowed={capabilities.canBuildQuotes}><QuoteBuilderRoute mode="edit" /></RouteGuard>} />
        <Route path="/appointments/:appointmentId/quote" element={<RouteGuard allowed={capabilities.canBuildQuotes}><QuoteBuilderRoute mode="new" /></RouteGuard>} />
        <Route path="/schedule" element={<RouteGuard allowed={capabilities.isAdmin || capabilities.isScheduleAdministrator}><ScheduleRoute /></RouteGuard>} />
        <Route path="/assignments" element={<RouteGuard allowed={capabilities.isAdmin || capabilities.isManagement}><AssignmentsView /></RouteGuard>} />
        <Route path="/users" element={<RouteGuard allowed={capabilities.isAdmin}><UsersView /></RouteGuard>} />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>
    </Suspense>
  );
}

function RouteGuard({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return allowed ? children : <Navigate to="/calendar" replace />;
}

function CalendarRoute({ role }: { role: Role }) {
  const navigate = useNavigate();

  function startQuote(appointment: AppointmentDto) {
    if (!appointment.id) return;
    navigate(`/appointments/${appointment.id}/quote`, { state: { returnTo: '/calendar' } });
  }

  return (
    <CalendarView
      role={role}
      onStartQuote={startQuote}
      onOpenQuote={(quoteId: number) => navigate(`/quotes/${quoteId}`)}
    />
  );
}

function QuotesRoute({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { quoteId: quoteIdParam } = useParams();
  const quoteId = parseRouteId(quoteIdParam);
  if (quoteIdParam && !quoteId) return <Navigate to="/quotes" replace />;

  function editQuote(quote: QuoteDto) {
    navigate(`/quotes/${quote.id}/edit`, { state: { returnTo: `/quotes/${quote.id}` } });
  }

  return (
    <QuotesView
      role={role}
      initialQuoteId={quoteId}
      onOpenedInitialQuote={() => undefined}
      onOpenQuote={(id: number) => navigate(`/quotes/${id}`)}
      onCloseQuote={() => navigate('/quotes')}
      onEditQuote={editQuote}
    />
  );
}

function QuoteBuilderRoute({ mode }: { mode: 'new' | 'edit' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const quoteId = parseRouteId(params.quoteId);
  const appointmentId = parseRouteId(params.appointmentId);
  const isEditing = mode === 'edit';
  const quoteQuery = useGetQuoteQuery(quoteId || 0, { skip: !isEditing || !quoteId });
  const appointmentsQuery = useGetAppointmentsQuery('', { skip: isEditing });
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo
    || (isEditing && quoteId ? `/quotes/${quoteId}` : '/calendar');

  if ((isEditing && !quoteId) || (!isEditing && !appointmentId)) {
    return <Navigate to={isEditing ? '/quotes' : '/calendar'} replace />;
  }

  if ((isEditing && quoteQuery.isLoading) || (!isEditing && appointmentsQuery.isLoading)) {
    return <div className="empty">Loading quote context...</div>;
  }

  const appointment = isEditing
    ? quoteQuery.data && appointmentFromQuote(quoteQuery.data)
    : appointmentFromCalendar(appointmentsQuery.data?.find((item) => item.id === appointmentId));

  if (!appointment) {
    return <section className="workspace narrow"><div className="error">The quote or appointment could not be loaded.</div></section>;
  }

  return (
    <QuoteBuilder
      appointment={appointment}
      quoteId={isEditing ? quoteId : null}
      onDone={() => navigate(returnTo, { replace: true })}
    />
  );
}

function ScheduleRoute() {
  const navigate = useNavigate();
  return <ScheduleView onCreated={() => navigate('/calendar')} />;
}

function appointmentFromQuote(quote: QuoteDto): QuoteAppointmentContext | null {
  if (!quote.appointment_id) return null;
  return {
    id: quote.appointment_id,
    customer_name: quote.customer_name,
    site_address: quote.site_address,
    request_details: quote.request_details
  };
}

function appointmentFromCalendar(appointment?: AppointmentDto): QuoteAppointmentContext | null {
  if (!appointment?.id) return null;
  return {
    id: appointment.id,
    client_name: appointment.client_name,
    customer_name: appointment.customer_name,
    site_address: appointment.site_address,
    request_details: appointment.request_details
  };
}

function parseRouteId(value?: string) {
  if (!value) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
