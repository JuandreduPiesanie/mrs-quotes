import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelectedItem } from '../domain/quoteRules';
import type { PriceItem, SelectedQuoteItem } from '../domain/quoteTypes';

export interface QuoteWizardState {
  step: 1 | 2 | 3;
  selectedTradeCodes: string[];
  activeTradeCode: string;
  catalogSearch: string;
  catalogCategory: string;
  selectedItems: SelectedQuoteItem[];
}

const initialState: QuoteWizardState = {
  step: 1,
  selectedTradeCodes: [],
  activeTradeCode: '',
  catalogSearch: '',
  catalogCategory: 'All',
  selectedItems: []
};

const quoteWizardSlice = createSlice({
  name: 'quoteWizard',
  initialState,
  reducers: {
    quoteWizardReset: () => initialState,
    quoteWizardRestored(_state, action: PayloadAction<{ items: SelectedQuoteItem[]; tradeCodes: string[] }>) {
      return {
        ...initialState,
        step: action.payload.tradeCodes.length ? 2 : 1,
        selectedItems: action.payload.items,
        selectedTradeCodes: action.payload.tradeCodes,
        activeTradeCode: action.payload.tradeCodes[0] || ''
      };
    },
    stepChanged(state, action: PayloadAction<1 | 2 | 3>) {
      state.step = action.payload;
    },
    tradeSelected(state, action: PayloadAction<string>) {
      if (!state.selectedTradeCodes.includes(action.payload)) state.selectedTradeCodes.push(action.payload);
      if (!state.activeTradeCode) state.activeTradeCode = action.payload;
    },
    tradeRemoved(state, action: PayloadAction<string>) {
      state.selectedTradeCodes = state.selectedTradeCodes.filter((code) => code !== action.payload);
      state.selectedItems = state.selectedItems.filter((item) => item.tradeCode !== action.payload);
      if (state.activeTradeCode === action.payload) state.activeTradeCode = state.selectedTradeCodes[0] || '';
    },
    activeTradeChanged(state, action: PayloadAction<string>) {
      state.activeTradeCode = action.payload;
      state.catalogSearch = '';
      state.catalogCategory = 'All';
    },
    catalogSearchChanged(state, action: PayloadAction<string>) {
      state.catalogSearch = action.payload;
    },
    catalogCategoryChanged(state, action: PayloadAction<string>) {
      state.catalogCategory = action.payload;
    },
    lineItemAdded(state, action: PayloadAction<PriceItem>) {
      if (!state.selectedItems.some((item) => item.priceItemId === action.payload.id)) {
        state.selectedItems.push(createSelectedItem(action.payload));
      }
    },
    lineItemRemoved(state, action: PayloadAction<number>) {
      state.selectedItems = state.selectedItems.filter((item) => item.priceItemId !== action.payload);
    },
    quantityChanged(state, action: PayloadAction<{ id: number; quantity: number | '' }>) {
      const item = state.selectedItems.find((line) => line.priceItemId === action.payload.id);
      if (item) item.quantity = action.payload.quantity;
    },
    enteredRateChanged(state, action: PayloadAction<{ id: number; enteredRate: number | '' }>) {
      const item = state.selectedItems.find((line) => line.priceItemId === action.payload.id);
      if (item) item.enteredRate = action.payload.enteredRate;
    }
  }
});

export const {
  quoteWizardReset,
  quoteWizardRestored,
  stepChanged,
  tradeSelected,
  tradeRemoved,
  activeTradeChanged,
  catalogSearchChanged,
  catalogCategoryChanged,
  lineItemAdded,
  lineItemRemoved,
  quantityChanged,
  enteredRateChanged
} = quoteWizardSlice.actions;

export default quoteWizardSlice.reducer;
