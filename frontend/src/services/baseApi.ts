import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ExistingQuote, PriceItem, Trade } from '../features/quotes/domain/quoteTypes';
import type {
  AppointmentDto,
  AppointmentRequestDto,
  AssignQuoteAdministratorRequestDto,
  AuthResultDto,
  ClientDto,
  CompleteQuoteRequestDto,
  CreateUserRequestDto,
  FirstAdminRequestDto,
  LoginRequestDto,
  OperationResultDto,
  QuoteCreatedDto,
  QuoteDto,
  QuoteStatus,
  SetupStatusDto,
  UserDto,
  ValidationProblemDto
} from './apiDtos';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const baseApi = createApi({
  reducerPath: 'mrsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders(headers, { getState }) {
      const token = (getState() as { auth: { session: { token: string } | null } }).auth.session?.token;
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    }
  }),
  tagTypes: ['Appointments', 'PriceItems', 'Quotes', 'Users'],
  endpoints: (build) => ({
    login: build.mutation<AuthResultDto, LoginRequestDto>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body })
    }),
    getSetupStatus: build.query<SetupStatusDto, void>({
      query: () => '/auth/setup-status'
    }),
    setupFirstAdmin: build.mutation<AuthResultDto, FirstAdminRequestDto>({
      query: (body) => ({ url: '/auth/setup', method: 'POST', body })
    }),
    getTrades: build.query<Trade[], void>({
      query: () => '/price-trades',
      providesTags: ['PriceItems']
    }),
    getPriceItems: build.query<PriceItem[], string>({
      query: (trade) => `/price-items?trade=${encodeURIComponent(trade)}`,
      providesTags: ['PriceItems']
    }),
    getQuote: build.query<ExistingQuote, number>({
      query: (id) => `/quotes/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Quotes', id }]
    }),
    getQuotes: build.query<QuoteDto[], { assessorId: string; status: QuoteStatus }>({
      query: ({ assessorId, status }) => {
        const params = new URLSearchParams({ status });
        if (assessorId && assessorId !== 'all') params.set('assessorId', assessorId);
        return `/quotes?${params.toString()}`;
      },
      providesTags: ['Quotes']
    }),
    getAppointments: build.query<AppointmentDto[], string>({
      query: (assessorId) => `/appointments${assessorId ? `?assessorId=${assessorId}` : ''}`,
      providesTags: ['Appointments']
    }),
    getAssessors: build.query<UserDto[], void>({
      query: () => '/users/assessors',
      providesTags: ['Users']
    }),
    getQuoteAdministrators: build.query<UserDto[], void>({
      query: () => '/users/quote-administrators',
      providesTags: ['Users']
    }),
    getUsers: build.query<UserDto[], void>({
      query: () => '/users',
      providesTags: ['Users']
    }),
    getClients: build.query<ClientDto[], string>({
      query: (search) => `/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`
    }),
    createUser: build.mutation<UserDto, CreateUserRequestDto>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['Users']
    }),
    assignQuoteAdministrator: build.mutation<UserDto, AssignQuoteAdministratorRequestDto>({
      query: ({ assessorId, quoteAdministratorId }) => ({
        url: `/users/assessors/${assessorId}/quote-administrator`,
        method: 'PATCH',
        body: { quoteAdministratorId }
      }),
      invalidatesTags: ['Users']
    }),
    createAppointment: build.mutation<AppointmentDto, AppointmentRequestDto>({
      query: (body) => ({ url: '/appointments', method: 'POST', body }),
      invalidatesTags: ['Appointments']
    }),
    updateAppointment: build.mutation<AppointmentDto, { id: number; body: AppointmentRequestDto }>({
      query: ({ id, body }) => ({ url: `/appointments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Appointments']
    }),
    cancelAppointment: build.mutation<OperationResultDto, number>({
      query: (id) => ({ url: `/appointments/${id}/cancel`, method: 'PATCH' }),
      invalidatesTags: ['Appointments']
    }),
    completeQuote: build.mutation<OperationResultDto, CompleteQuoteRequestDto>({
      query: ({ id, ...body }) => ({ url: `/quotes/${id}/complete`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Quotes', id }, 'Quotes', 'Appointments']
    }),
    submitQuote: build.mutation<QuoteCreatedDto, FormData>({
      query: (body) => ({ url: '/quotes', method: 'POST', body }),
      invalidatesTags: ['Quotes', 'Appointments']
    }),
    updateQuote: build.mutation<OperationResultDto, { id: number; body: FormData }>({
      query: ({ id, body }) => ({ url: `/quotes/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Quotes', id }, 'Quotes', 'Appointments']
    })
  })
});

export const {
  useGetSetupStatusQuery,
  useLoginMutation,
  useSetupFirstAdminMutation,
  useGetTradesQuery,
  useGetPriceItemsQuery,
  useGetQuoteQuery,
  useLazyGetQuoteQuery,
  useGetQuotesQuery,
  useGetAppointmentsQuery,
  useGetAssessorsQuery,
  useGetQuoteAdministratorsQuery,
  useGetUsersQuery,
  useGetClientsQuery,
  useCreateUserMutation,
  useAssignQuoteAdministratorMutation,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useCancelAppointmentMutation,
  useCompleteQuoteMutation,
  useSubmitQuoteMutation,
  useUpdateQuoteMutation
} = baseApi;

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (error instanceof Error) return error.message;
  const apiError = error as { data?: ValidationProblemDto };
  const validationMessage = apiError?.data?.errors && Object.values(apiError.data.errors).flat()[0];
  return apiError?.data?.error || apiError?.data?.detail || validationMessage || fallback;
}
