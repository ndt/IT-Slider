import { expect } from "@std/expect";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { Dimension, DimensionList, LockStatus } from './domain.ts';

describe('Dimension', () => {
    it('should clamp values between 0 and maxValue', () => {
        const d = new Dimension('Test', 5, 10);
        d.setValue(15);
        expect(d.value).toBe(10);
        d.setValue(-5);
        expect(d.value).toBe(0);
    });

    it('should respect full lock', () => {
        const d = new Dimension('Test', 5, 10, LockStatus.FULL);
        d.setValue(8);
        expect(d.value).toBe(5);
    });

    it('should respect min lock', () => {
        const d = new Dimension('Test', 5, 10, LockStatus.MIN, 5);
        d.setValue(3);
        expect(d.value).toBe(5);
        d.setValue(8);
        expect(d.value).toBe(8);
    });

    it('should toggle locks correctly', () => {
        const d = new Dimension('Test', 5, 10);
        expect(d.lockStatus).toBe(LockStatus.OFF);
        d.toggleLock();
        expect(d.lockStatus).toBe(LockStatus.MIN);
        expect(d.lockedMinValue).toBe(5);
        d.toggleLock();
        expect(d.lockStatus).toBe(LockStatus.FULL);
        d.toggleLock();
        expect(d.lockStatus).toBe(LockStatus.OFF);
    });
});

describe('DimensionList', () => {
    let list: DimensionList;

    beforeEach(() => {
        list = new DimensionList([
            new Dimension('D1', 5, 10),
            new Dimension('D2', 5, 10)
        ]);
    });

    it('should calculate total value', () => {
        expect(list.totalValue).toBe(10);
    });

    it('should balance correctly when one dimension is adjusted', () => {
        // Total budget is 10. D1 is set to 7, so D2 should become 3.
        list.get(0).setValue(7);
        list.balance(0, 10);
        expect(list.get(1).value).toBe(3);
    });

    it('should distribute fairly', () => {
        list.distributeFairly(20);
        expect(list.get(0).value).toBe(10);
        expect(list.get(1).value).toBe(10);
    });

    it('should respect locks during balance', () => {
        list.add(new Dimension('D3', 5, 10, LockStatus.FULL));
        // Total is 15. Change D1 to 7. Diff is 15 - (7+5+5) = -2.
        // D3 is locked, so only D2 should change.
        list.get(0).setValue(7);
        list.balance(0, 15);
        expect(list.get(1).value).toBe(3);
        expect(list.get(2).value).toBe(5);
    });
});
