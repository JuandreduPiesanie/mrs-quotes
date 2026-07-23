import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../app/store';
import { isQuoteReadyForReview } from '../domain/quoteRules';

export const selectQuoteWizard = (state: RootState) => state.quoteWizard;
export const selectSelectedQuoteItems = (state: RootState) => state.quoteWizard.selectedItems;
export const selectCanReviewQuote = createSelector(selectSelectedQuoteItems, isQuoteReadyForReview);
