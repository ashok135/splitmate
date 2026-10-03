/**
 * Currency utilities for Indian Rupee (INR) and Paise precision
 */

export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

export const paiseToRupees = (paise: number): number => {
  return Number((paise / 100).toFixed(2));
};

export const formatINR = (amount: number, showSign: boolean = false): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: absAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  if (showSign) {
    if (isNegative) return `-${formatted}`;
    if (amount > 0) return `+${formatted}`;
  }
  return isNegative ? `-${formatted}` : formatted;
};

export const parseAmountInput = (input: string): number => {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
