import {
  calculateEqualSplit,
  calculateCustomSplit,
  calculatePercentageSplit,
} from '../src/utils/splitCalculator';

describe('Split Calculator', () => {
  describe('Equal Split', () => {
    it('splits ₹500 across 4 members without remainder', () => {
      const members = ['user1', 'user2', 'user3', 'user4'];
      const splits = calculateEqualSplit(500, members);

      expect(splits['user1'].amountOwed).toBe(125);
      expect(splits['user2'].amountOwed).toBe(125);
      expect(splits['user3'].amountOwed).toBe(125);
      expect(splits['user4'].amountOwed).toBe(125);

      const totalSum = Object.values(splits).reduce((sum, s) => sum + s.amountOwed, 0);
      expect(totalSum).toBe(500);
    });

    it('splits ₹100 across 3 members with exact paise rounding', () => {
      const members = ['user1', 'user2', 'user3'];
      const splits = calculateEqualSplit(100, members);

      // 10000 paise / 3 = 3333 paise each with 1 paise remainder
      // user1 gets 3334 paise (₹33.34), others get 3333 paise (₹33.33)
      expect(splits['user1'].amountOwed).toBe(33.34);
      expect(splits['user2'].amountOwed).toBe(33.33);
      expect(splits['user3'].amountOwed).toBe(33.33);

      const totalSum = Number(
        Object.values(splits).reduce((sum, s) => sum + s.amountOwed, 0).toFixed(2)
      );
      expect(totalSum).toBe(100.00);
    });
  });

  describe('Custom Split', () => {
    it('validates matching custom split amounts', () => {
      const customAmounts = {
        user1: 200,
        user2: 150,
        user3: 150,
      };
      const result = calculateCustomSplit(500, customAmounts);
      expect(result.isValid).toBe(true);
      expect(result.difference).toBe(0);
      expect(result.splits['user1'].amountOwed).toBe(200);
    });

    it('flags invalid custom split if amounts do not sum to total', () => {
      const customAmounts = {
        user1: 200,
        user2: 100,
      };
      const result = calculateCustomSplit(500, customAmounts);
      expect(result.isValid).toBe(false);
      expect(result.difference).toBe(200);
    });
  });

  describe('Percentage Split', () => {
    it('validates 50%, 25%, 25% across ₹800', () => {
      const percentages = {
        user1: 50,
        user2: 25,
        user3: 25,
      };
      const result = calculatePercentageSplit(800, percentages);
      expect(result.isValid).toBe(true);
      expect(result.percentageSum).toBe(100);
      expect(result.splits['user1'].amountOwed).toBe(400);
      expect(result.splits['user2'].amountOwed).toBe(200);
      expect(result.splits['user3'].amountOwed).toBe(200);

      const totalSum = Object.values(result.splits).reduce((s, item) => s + item.amountOwed, 0);
      expect(totalSum).toBe(800);
    });

    it('rejects percentages that do not sum to 100%', () => {
      const percentages = {
        user1: 40,
        user2: 30,
      };
      const result = calculatePercentageSplit(500, percentages);
      expect(result.isValid).toBe(false);
      expect(result.percentageSum).toBe(70);
    });
  });
});
