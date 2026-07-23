import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { readSession, type Session } from '../../services/sessionService';

interface AuthState {
  session: Session | null;
}

const initialState: AuthState = {
  session: readSession()
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<Session>) {
      state.session = action.payload;
    },
    sessionEnded(state) {
      state.session = null;
    }
  }
});

export const { sessionStarted, sessionEnded } = authSlice.actions;
export default authSlice.reducer;
