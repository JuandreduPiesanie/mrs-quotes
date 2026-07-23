import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelectedItem } from '../domain/quoteRules';
import type { PriceItem, SelectedQuoteItem } from '../domain/quoteTypes';

export interface QuoteWizardState {
  step: 1 | 2 | 3;
  selectedTradeCodes: string[];
  activeTradeCode: string;
  activeLocation: string;
  catalogSearch: string;
  catalogCategory: string;
  selectedItems: SelectedQuoteItem[];
}

const initialState: QuoteWizardState = {
  step: 1,
  selectedTradeCodes: [],
  activeTradeCode: '',
  activeLocation: '',
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
        activeTradeCode: action.payload.tradeCodes[0] || '',
        activeLocation: action.payload.items[0]?.location || ''
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
    activeLocationChanged(state, action: PayloadAction<string>) {
      state.activeLocation = action.payload;
    },
    catalogSearchChanged(state, action: PayloadAction<string>) {
      state.catalogSearch = action.payload;
    },
    catalogCategoryChanged(state, action: PayloadAction<string>) {
      state.catalogCategory = action.payload;
    },
    lineItemAdded(state, action: PayloadAction<{ item: PriceItem; location: string }>) {
      const selectedItem = createSelectedItem(action.payload.item, action.payload.location);
      if (selectedItem.location && !state.selectedItems.some((item) => item.selectionId === selectedItem.selectionId)) {
        state.selectedItems.push(selectedItem);
      }
    },
    lineItemRemoved(state, action: PayloadAction<string>) {
      state.selectedItems = state.selectedItems.filter((item) => item.selectionId !== action.payload);
    },
    quantityChanged(state, action: PayloadAction<{ id: string; quantity: number | '' }>) {
      const item = state.selectedItems.find((line) => line.selectionId === action.payload.id);
      if (item) item.quantity = action.payload.quantity;
    },
    enteredRateChanged(state, action: PayloadAction<{ id: string; enteredRate: number | '' }>) {
      const item = state.selectedItems.find((line) => line.selectionId === action.payload.id);
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
  activeLocationChanged,
  catalogSearchChanged,
  catalogCategoryChanged,
  lineItemAdded,
  lineItemRemoved,
  quantityChanged,
  enteredRateChanged
} = quoteWizardSlice.actions;

export default quoteWizardSlice.reducer;
