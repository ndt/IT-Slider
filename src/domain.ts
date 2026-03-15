export enum LockStatus {
    OFF = 0,
    MIN = 1,
    FULL = 2
}

export interface DimensionJSON {
    readonly label: string;
    readonly value: number;
    readonly maxValue: number;
    readonly lockStatus?: LockStatus;
    readonly lockedMinValue?: number;
    readonly currentValue?: number; // for legacy imports
}

export interface DimensionListJSON {
    readonly dimensions: readonly DimensionJSON[];
    readonly isFullState?: boolean;
    readonly totalBudget?: number;
}

export class Dimension {
    constructor(
        public label: string,
        public value: number,
        public maxValue: number,
        public lockStatus: LockStatus = LockStatus.OFF,
        public lockedMinValue: number = 0
    ) {}

    static fromJSON(json: DimensionJSON): Dimension {
        return new Dimension(
            json.label,
            json.value ?? json.currentValue ?? 0,
            json.maxValue,
            json.lockStatus ?? LockStatus.OFF,
            json.lockedMinValue ?? 0
        );
    }

    toJSON(): DimensionJSON {
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

    toggleLock(): void {
        this.lockStatus = (this.lockStatus + 1) % 3;
        this.lockedMinValue = (this.lockStatus === LockStatus.MIN) ? this.value : 0;
    }

    clampValue(val: number): number {
        const min = this.isMinLocked ? this.lockedMinValue : 0;
        return Math.max(min, Math.min(this.maxValue, val));
    }

    setValue(val: number): void {
        if (this.isLocked) return;
        this.value = this.clampValue(val);
    }
}

export class DimensionList {
    private dimensions: Dimension[] = [];

    constructor(dimensions: Dimension[] = []) {
        this.dimensions = dimensions;
    }

    static fromJSON(json: DimensionListJSON): DimensionList {
        const dims = (json.dimensions || []).map((d: DimensionJSON) => Dimension.fromJSON(d));
        return new DimensionList(dims);
    }

    toJSON(): DimensionListJSON {
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

    add(dim: Dimension): void {
        this.dimensions.push(dim);
    }

    remove(index: number): void {
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

    adjustToTotal(totalBudget: number): void {
        this.balance(null, totalBudget);
    }

    distributeFairly(totalBudget: number): void {
        const sumM = this.totalMaxValue();
        if (sumM > 0) {
            this.dimensions.forEach(d => {
                d.value = d.maxValue * (totalBudget / sumM);
            });
        }
    }

    fillToMaximum(): void {
        this.dimensions.forEach(d => d.value = d.maxValue);
    }
}
