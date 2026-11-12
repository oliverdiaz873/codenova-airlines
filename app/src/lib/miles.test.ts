import { describe, expect, it } from 'vitest';
import {
  computeAccruedMiles,
  maxRedeemableMiles,
  milesToDiscount,
  validateRedemptionMiles,
} from '@/lib/miles';

describe('milesToDiscount', () => {
  it('converts 10 miles to RD$1', () => {
    expect(milesToDiscount(10_000)).toBe(1_000);
    expect(milesToDiscount(1_000)).toBe(100);
    expect(milesToDiscount(500)).toBe(50);
  });
});

describe('computeAccruedMiles', () => {
  it('accrues distance x 2 legs x passengers at 100%', () => {
    expect(computeAccruedMiles(250, 1)).toBe(500);
    expect(computeAccruedMiles(850, 2)).toBe(3_400);
    expect(computeAccruedMiles(1_000, 3)).toBe(6_000);
  });
});

describe('validateRedemptionMiles', () => {
  it('accepts valid amounts within balance', () => {
    expect(validateRedemptionMiles(10_000, 1_000)).toBeNull();
    expect(validateRedemptionMiles(10_000, 5_000)).toBeNull();
    expect(validateRedemptionMiles(10_000, 10_000)).toBeNull();
  });

  it('rejects amounts below the 1,000 minimum', () => {
    expect(validateRedemptionMiles(10_000, 500)).not.toBeNull();
    expect(validateRedemptionMiles(10_000, 0)).not.toBeNull();
  });

  it('rejects amounts that are not multiples of 1,000', () => {
    expect(validateRedemptionMiles(10_000, 1_500)).not.toBeNull();
    expect(validateRedemptionMiles(10_000, 2_500)).not.toBeNull();
  });

  it('rejects amounts above the balance', () => {
    expect(validateRedemptionMiles(5_000, 6_000)).not.toBeNull();
  });

  it('rejects non-integer amounts', () => {
    expect(validateRedemptionMiles(10_000, 1_000.5)).not.toBeNull();
  });
});

describe('maxRedeemableMiles', () => {
  it('caps by balance in steps of 1,000', () => {
    expect(maxRedeemableMiles(10_500, 1_000_000)).toBe(10_000);
    expect(maxRedeemableMiles(950, 1_000_000)).toBe(0);
  });

  it('caps so the discount never exceeds the pending amount', () => {
    // pending RD$15,800 -> max discount RD$15,800 -> max 158,000 miles
    expect(maxRedeemableMiles(1_000_000, 15_800)).toBe(158_000);
    // pending RD$7,700 -> discount cap RD$7,700 -> 77,000 miles
    expect(maxRedeemableMiles(1_000_000, 7_700)).toBe(77_000);
    // pending RD$0 -> nothing redeemable
    expect(maxRedeemableMiles(10_000, 0)).toBe(0);
  });

  it('takes the smaller of balance and pending caps', () => {
    expect(maxRedeemableMiles(5_000, 100)).toBe(1_000);
  });
});
