import { Dimension, DimensionList, LockStatus, DimensionListJSON } from './domain.js';
import config from './config.js';

// --- TYPES & INTERFACES ---
interface AppState {
    dimensions: DimensionListJSON;
}
/**
 * Typed Chart.js subset to avoid 'any'. 
 * Note: Full types can be added via npm install @types/chart.js if needed.
 */
interface RadarChartDataset {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    pointBackgroundColor?: string;
    borderDash?: number[];
    pointRadius?: number;
}

interface RadarChart {
    data: {
        labels: string[];
        datasets: RadarChartDataset[];
    };
    update(mode?: string): void;
    destroy(): void;
}

// --- HELPERS ---

class DOMUtils {
    static get<T extends HTMLElement>(id: string): T {
        const el = document.getElementById(id);
        if (!el) throw new Error(`Element with id "${id}" not found.`);
        return el as T;
    }

    static getInput(id: string): HTMLInputElement {
        return this.get<HTMLInputElement>(id);
    }
}

class HistoryManager {
    private stack: string[] = [];
    private step: number = -1;
    private readonly maxDepth = 50;

    save(state: AppState): void {
        const newState = JSON.stringify(state);
        if (this.step >= 0 && this.stack[this.step] === newState) return;
        
        this.stack = this.stack.slice(0, this.step + 1);
        this.stack.push(newState);
        this.step++;
        
        if (this.stack.length > this.maxDepth) {
            this.stack.shift();
            this.step--;
        }
    }

    undo(): AppState | null {
        if (this.canUndo()) {
            this.step--;
            return JSON.parse(this.stack[this.step]);
        }
        return null;
    }

    redo(): AppState | null {
        if (this.canRedo()) {
            this.step++;
            return JSON.parse(this.stack[this.step]);
        }
        return null;
    }

    canUndo(): boolean { return this.step > 0; }
    canRedo(): boolean { return this.step < this.stack.length - 1; }
}

class ChartManager {
    private chart: RadarChart;

    constructor(ctx: CanvasRenderingContext2D, labels: string[], values: number[], maxValues: number[]) {
        // @ts-ignore (Chart.js via CDN)
        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Aktuelle Planung',
                        data: values,
                        backgroundColor: 'rgba(52, 152, 219, 0.3)',
                        borderColor: '#3498db',
                        borderWidth: 3,
                        pointBackgroundColor: '#3498db'
                    },
                    {
                        label: 'Maximaler Bedarf',
                        data: maxValues,
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderColor: 'rgba(231, 76, 60, 0.4)',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        suggestedMax: 10,
                        ticks: { stepSize: 2 }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    update(values: number[], maxValues: number[]): void {
        this.chart.data.datasets[0].data = values;
        this.chart.data.datasets[1].data = maxValues;
        this.chart.update('none');
    }

    destroy(): void {
        this.chart.destroy();
    }
}

class ConfigManager {
    static export(dimensionList: DimensionList): void {
        const fullState = confirm("Gesamten Zustand speichern?");
        const configData = {
            ...dimensionList.toJSON(),
            isFullState: fullState
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configData, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = fullState ? "it_ressourcen_vollzustand.json" : "it_ressourcen_konfig.json";
        a.click();
    }

    static import(event: Event): Promise<{ dimensions: DimensionList, useFull: boolean } | null> {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return Promise.resolve(null);

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    if (!e.target?.result) {
                        resolve(null);
                        return;
                    }
                    const imported = JSON.parse(e.target.result as string);
                    const useFull = (imported.isFullState && confirm("Gesamtzustand laden?"));
                    
                    const dimensionList = DimensionList.fromJSON(imported);
                    
                    target.value = "";
                    resolve({ dimensions: dimensionList, useFull });
                } catch (_err) { 
                    alert("Fehler beim Laden."); 
                    resolve(null);
                }
            };
            reader.readAsText(file);
        });
    }
}

class ITResourcePlanner {
    private dimensions: DimensionList;
    private initialConfig: DimensionListJSON;
    
    private history = new HistoryManager();
    private chartManager!: ChartManager;

    constructor() {
        this.dimensions = DimensionList.fromJSON(config);
        this.initialConfig = JSON.parse(JSON.stringify(config));

        this.initChart();
        this.initEventListeners();
        this.buildConfigTable();
        this.renderSliders();
        this.saveState();
        this.updateUI(false);
    }

    private initChart(): void {
        const ctx = DOMUtils.get<HTMLCanvasElement>('resourceChart').getContext('2d');
        if (!ctx) return;
        
        if (this.chartManager) {
            this.chartManager.destroy();
        }
        
        this.chartManager = new ChartManager(
            ctx, 
            this.dimensions.getLabels(), 
            this.dimensions.getValues(), 
            this.dimensions.getMaxValues()
        );
    }

    private initEventListeners(): void {
        const clickActions: Record<string, () => void> = {
            'btnApplyConfig': () => this.reInitialize(),
            'btnExport': () => ConfigManager.export(this.dimensions),
            'btnImportTrigger': () => DOMUtils.get('fileInput').click(),
            'btnUndo': () => this.undo(),
            'btnRedo': () => this.redo(),
            'btnFair': () => this.distributeFairly(),
            'btnFull': () => this.fillToMaximum(),
            'btnReset': () => this.resetToInitial()
        };

        Object.entries(clickActions).forEach(([id, action]) => {
            document.getElementById(id)?.addEventListener('click', action);
        });

        const fileInput = DOMUtils.get<HTMLInputElement>('fileInput');
        fileInput.addEventListener('change', async (e) => {
            const result = await ConfigManager.import(e);
            if (result) {
                this.dimensions = result.dimensions;
                this.buildConfigTable();
                this.reInitialize(true);
            }
        });

        const totalSlider = DOMUtils.getInput('totalSumSlider');
        totalSlider.oninput = () => {
            this.dimensions.adjustToTotal(parseFloat(totalSlider.value));
            this.updateUI(false);
        };
        totalSlider.onchange = () => this.saveState();
    }

    private renderSliders(): void {
        const container = DOMUtils.get('slidersContainer');
        container.innerHTML = '';

        this.dimensions.items.forEach((dim, i) => {
            const row = document.createElement('tr');

            const lockClass = dim.isMinLocked ? 'accent-orange' : (dim.isLocked ? 'accent-red' : '');
            const icon = dim.isMinLocked ? 'warning' : (dim.isLocked ? 'danger' : 'secondary');

            row.innerHTML = `
                <td class="text-nowrap">
                    <label class="form-label mb-0"><span class="bi bi-circle-fill text-${icon}"></span> ${dim.label}</label>
                </td>
                <td class="text-nowrap">
                    <span class="btn-adj minus bi bi-dash-circle"></span>
                    <input style="width: 80%;" type="range" id="slider${i}" class="mx-3 form-range ${lockClass}" min="0" max="${dim.maxValue}" step="0.1" value="${dim.value}">
                    <span class="btn-adj plus bi bi-plus-circle"></span>
                </td>
                <td>
                    <span class="small text-warning">${dim.isMinLocked ? `MIN: ${dim.lockedMinValue.toFixed(1)}` : ''}</span>
                </td>
                <td class="text-end text-nowrap">
                    <div class="font-monospace text-success" id="val${i}">
                        ${dim.value.toFixed(1)} <span class="text-muted fw-normal">/ ${dim.maxValue.toFixed(1)}</span>
                    </div>
                </td>
            `;

            const slider = row.querySelector(`#slider${i}`) as HTMLInputElement;
            slider.oninput = () => this.manualAdjust(i, parseFloat(slider.value));
            slider.onchange = () => this.saveState();
            slider.oncontextmenu = (e) => { e.preventDefault(); this.toggleLock(i); };

            row.querySelector('.btn-adj.minus')?.addEventListener('click', () => this.stepAdjust(i, -0.1));
            row.querySelector('.btn-adj.plus')?.addEventListener('click', () => this.stepAdjust(i, 0.1));

            container.appendChild(row);
        });
    }

    private updateUI(shouldSave: boolean = true): void {
        const currentTotal = this.dimensions.totalValue;
        DOMUtils.get('totalDisplay').innerText = currentTotal.toFixed(1);
        DOMUtils.getInput('totalSumSlider').value = currentTotal.toFixed(1);

        this.dimensions.items.forEach((dim, i) => {
            const s = document.getElementById(`slider${i}`) as HTMLInputElement;
            if (s && parseFloat(s.value) !== parseFloat(dim.value.toFixed(1))) {
                s.value = dim.value.toString();
            }
            const v = document.getElementById(`val${i}`);
            if (v) {
                const label = `${dim.value.toFixed(1)} <span class="text-muted small fw-normal">/ ${dim.maxValue.toFixed(1)}</span>`;
                if (v.innerHTML !== label) v.innerHTML = label;
            }
        });

        this.chartManager.update(this.dimensions.getValues(), this.dimensions.getMaxValues());

        if (shouldSave) this.saveState();
        this.updateHistoryButtons();
    }


    private manualAdjust(idx: number, target: number): void {
        const budgetToKeep = this.dimensions.totalValue;
        const dim = this.dimensions.get(idx);
        dim.setValue(target);
        const rem = this.dimensions.balance(idx, budgetToKeep);
        if (rem < -0.001) dim.value += rem; 
        this.updateUI(false);
    }

    private stepAdjust(i: number, amt: number): void {
        const dim = this.dimensions.get(i);
        if (dim.isLocked) return;
        dim.setValue(dim.value + amt);
        this.updateUI();
    }

    private toggleLock(i: number): void {
        this.dimensions.get(i).toggleLock();
        this.renderSliders();
        this.updateUI();
    }

    private saveState(): void {
        this.history.save({
            dimensions: this.dimensions.toJSON()
        });
    }

    private undo(): void {
        const state = this.history.undo();
        if (state) this.applyState(state);
    }

    private redo(): void {
        const state = this.history.redo();
        if (state) this.applyState(state);
    }

    private applyState(state: AppState): void {
        this.dimensions.items.forEach((dim, i) => {
            const dimState = state.dimensions.dimensions[i];
            if (dimState) {
                dim.value = dimState.value;
                dim.lockStatus = dimState.lockStatus ?? LockStatus.OFF;
                dim.lockedMinValue = dimState.lockedMinValue ?? 0;
            }
        });
        this.renderSliders();
        this.updateUI(false);
    }

    private updateHistoryButtons(): void {
        DOMUtils.get<HTMLButtonElement>('btnUndo').disabled = !this.history.canUndo();
        DOMUtils.get<HTMLButtonElement>('btnRedo').disabled = !this.history.canRedo();
    }

    private buildConfigTable(): void {
        const tbody = DOMUtils.get('configTableBody');
        tbody.innerHTML = '';
        this.dimensions.items.forEach((dim, i) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-semibold">${dim.label}</td>
                <td><input type="number" class="form-control form-control-sm" id="cfgStart${i}" value="${(this.initialConfig.dimensions[i]?.value ?? 0).toFixed(1)}" step="0.1" style="width: 80px;"></td>
                <td><input type="number" class="form-control form-control-sm" id="cfgMax${i}" value="${dim.maxValue.toFixed(1)}" step="0.1" style="width: 80px;"></td>
                <td><button class="btn btn-sm btn-danger" onclick="window.planner.removeDimension(${i})"><span class="bi bi-trash"></span></button></td>
            `;
            tbody.appendChild(row);
        });

        // Add row for new dimension
        const addRow = document.createElement('tr');
        addRow.className = 'table-info';
        addRow.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" id="newDimLabel" placeholder="Neue Dimension..." style="min-width: 150px;"></td>
            <td class="text-muted small align-middle">Start: 0.0</td>
            <td class="text-muted small align-middle">Max: 5.0</td>
            <td><button class="btn btn-sm btn-success" id="btnDoAdd"><span class="bi bi-plus-lg"></span></button></td>
        `;
        tbody.appendChild(addRow);
        
        // Use document.getElementById directly as these elements were just added and DOM might need a tick or standard access
        const btnDoAdd = document.getElementById('btnDoAdd');
        if (btnDoAdd) {
            btnDoAdd.onclick = () => this.addNewDimension();
        }
        const newDimLabel = document.getElementById('newDimLabel');
        if (newDimLabel) {
            newDimLabel.onkeypress = (e: KeyboardEvent) => {
                if (e.key === 'Enter') this.addNewDimension();
            };
        }
    }

    private updateInitialConfig(): void {
        this.initialConfig = this.dimensions.toJSON();
    }

    public removeDimension(index: number): void {
        if (!confirm(`Dimension "${this.dimensions.get(index).label}" wirklich löschen?`)) return;
        this.dimensions.remove(index);
        this.updateInitialConfig();
        this.initChart(); // Re-init chart labels and axes
        this.buildConfigTable();
        this.renderSliders();
        this.updateUI();
    }

    private addNewDimension(): void {
        const labelInput = DOMUtils.getInput('newDimLabel');
        const label = labelInput.value.trim();
        if (!label) {
            labelInput.focus();
            return;
        }
        
        const maxValue = 5.0;
        const startValue = 0.0;

        const newDim = new Dimension(label, startValue, maxValue);
        this.dimensions.add(newDim);
        this.updateInitialConfig();
        
        this.initChart(); // Re-init chart labels and axes
        this.buildConfigTable();
        this.renderSliders();
        this.updateUI();
        
        // Focus the new input field again for quick sequential adding
        DOMUtils.get('newDimLabel').focus();
    }

    private reInitialize(fromScript = false): void {
        if (!fromScript) {
            this.dimensions.items.forEach((dim, i) => {
                dim.maxValue = parseFloat(DOMUtils.getInput(`cfgMax${i}`).value) || 0.1;
                const startVal = parseFloat(DOMUtils.getInput(`cfgStart${i}`).value) || 0;
                dim.value = Math.min(dim.maxValue, startVal);
                dim.lockStatus = LockStatus.OFF;
                dim.lockedMinValue = 0;
            });
        }
        const sumMax = this.dimensions.totalMaxValue();
        DOMUtils.get('maxPossible').innerText = sumMax.toFixed(1);
        DOMUtils.getInput('totalSumSlider').max = sumMax.toString();
        this.renderSliders();
        this.updateUI();
    }

    private distributeFairly(): void {
        this.dimensions.distributeFairly(this.dimensions.totalValue);
        this.updateUI();
    }

    private fillToMaximum(): void {
        this.dimensions.fillToMaximum();
        this.updateUI();
    }

    private resetToInitial(): void {
        this.dimensions = DimensionList.fromJSON(this.initialConfig);
        this.renderSliders();
        this.updateUI();
    }

}

globalThis.addEventListener('DOMContentLoaded', () => {
    (globalThis as unknown as { planner: ITResourcePlanner }).planner = new ITResourcePlanner();
});