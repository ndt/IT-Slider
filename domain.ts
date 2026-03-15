export enum LockStatus {
    OFF = 0,
    MIN = 1,
    FULL = 2
}

export class Dimension {
    constructor(
        public label: string,
        public value: number,
        public maxValue: number,
        public lockStatus: LockStatus = LockStatus.OFF,
        public lockedMinValue: number = 0
    ) {}

    static fromJSON(json: any): Dimension {
        return new Dimension(
            json.label,
            json.value,
            json.maxValue,
            json.lockStatus ?? LockStatus.OFF,
            json.lockedMinValue ?? 0
        );
    }

    toJSON(): any {
        return {
            label: this.label,
            value: this.value,
            maxValue: this.maxValue,
            lockStatus: this.lockStatus,
            lockedMinValue: this.lockedMinValue
        };
    }

    get isLocked(): boolean {
        return this.lockStatus === LockStatus.FULL;
    }

    get isMinLocked(): boolean {
        return this.lockStatus === LockStatus.MIN;
    }

    toggleLock() {
        this.lockStatus = (this.lockStatus + 1) % 3;
        this.lockedMinValue = (this.lockStatus === LockStatus.MIN) ? this.value : 0;
    }

    clampValue(val: number): number {
        const min = this.isMinLocked ? this.lockedMinValue : 0;
        return Math.max(min, Math.min(this.maxValue, val));
    }

    setValue(val: number) {
        if (this.isLocked) return;
        this.value = this.clampValue(val);
    }
}

export class DimensionList {
    private dimensions: Dimension[] = [];

    constructor(dimensions: Dimension[] = []) {
        this.dimensions = dimensions;
    }

    static fromJSON(json: any): DimensionList {
        const dims = (json.dimensions || []).map((d: any) => Dimension.fromJSON(d));
        return new DimensionList(dims);
    }

    toJSON(): any {
        return {
            dimensions: this.dimensions.map(d => d.toJSON())
        };
    }

    get items(): Dimension[] {
        return this.dimensions;
    }

    get totalValue(): number {
        return this.dimensions.reduce((sum, d) => sum + d.value, 0);
    }

    totalMaxValue(): number {
        return this.dimensions.reduce((sum, d) => sum + d.maxValue, 0);
    }

    add(dim: Dimension) {
        this.dimensions.push(dim);
    }

    remove(index: number) {
        if (index >= 0 && index < this.dimensions.length) {
            this.dimensions.splice(index, 1);
        }
    }

    get(index: number): Dimension {
        return this.dimensions[index];
    }

    getValues(): number[] {
        return this.dimensions.map(d => d.value);
    }

    getMaxValues(): number[] {
        return this.dimensions.map(d => d.maxValue);
    }

    getLabels(): string[] {
        return this.dimensions.map(d => d.label);
    }

    /**
     * Balances the total value to match the total budget by adjusting available dimensions.
     * @param excludeIdx Index to exclude from balancing (typically the slider being moved).
     * @param totalBudget The target sum.
     * @returns Remaining difference if fully balancing was not possible.
     */
    balance(excludeIdx: number | null, totalBudget: number): number {
        let diff = totalBudget - this.totalValue;
        if (Math.abs(diff) < 0.001) return 0;

        // Iterative balancing to handle multiple clamps correctly
        let prevDiff = diff;
        for (let iteration = 0; iteration < this.dimensions.length; iteration++) {
            const targets = this.dimensions.filter((d, i) => {
                if (i === excludeIdx || d.isLocked) return false;
                return diff < 0 ? (d.isMinLocked ? d.value > d.lockedMinValue : d.value > 0) : (d.value < d.maxValue);
            });

            if (targets.length === 0) break;

            const chg = diff / targets.length;
            targets.forEach(d => d.setValue(d.value + chg));

            diff = totalBudget - this.totalValue;
            if (Math.abs(diff) < 0.001 || Math.abs(diff - prevDiff) < 0.0001) break;
            prevDiff = diff;
        }

        return diff;
    }

    adjustToTotal(totalBudget: number) {
        this.balance(null, totalBudget);
    }

    distributeFairly(totalBudget: number) {
        const sumM = this.totalMaxValue();
        if (sumM > 0) {
            this.dimensions.forEach(d => {
                d.value = d.maxValue * (totalBudget / sumM);
            });
        }
    }

    fillToMaximum() {
        this.dimensions.forEach(d => d.value = d.maxValue);
    }
}
