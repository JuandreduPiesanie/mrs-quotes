import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../services/baseApi';
import authReducer from '../features/auth/authSlice';
import quoteWizardReducer from '../features/quotes/state/quoteWizardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    quoteWizard: quoteWizardReducer,
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
