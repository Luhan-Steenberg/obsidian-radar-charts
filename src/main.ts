import {App, Editor, MarkdownView, Modal, Notice, Plugin, QueryController, BasesView, parsePropertyId, HoverPopover, HoverParent, NumberValue, BasesPropertyType, debounce} from 'obsidian';
/* import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings"; */
import {Chart, ChartConfiguration, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

interface RadarCard {
    id: string; // Unique ID (usually file path)
    
    // 1. Data for the Chart.js canvas
    chartConfig: ChartConfiguration;
    
    // 2. Data for the list of properties below the chart
    listItems: {
        name: string;
        value: string;
        type: string;
    }[];

    // 3. Layout State (For your future Masonry engine)
    layout: {
        x: number;
        y: number;
        width: number;
        height: number; // Will be 0 until first render
    };

	 el? : HTMLElement;
}

interface InterfaceColors {
  bodyStyles: CSSStyleDeclaration;
  bgPrimary: string;
  bgSecondary: string;
  accentColor: string;
  accentColor1: string;
  accentColor2: string;
  gridColor: string;
  accentColor2HSLA: string;
}

const bodyStyles: CSSStyleDeclaration = window.getComputedStyle(document.body);

const interfaceColors: InterfaceColors = {
  bodyStyles,
  bgPrimary: bodyStyles.getPropertyValue('--background-primary').trim(),
  bgSecondary: bodyStyles.getPropertyValue('--background-secondary').trim(),
  accentColor: bodyStyles.getPropertyValue('--color-accent-hsl').trim(),
  accentColor1: bodyStyles.getPropertyValue('--color-accent-1').trim(),
  accentColor2: bodyStyles.getPropertyValue('--color-accent-2').trim(),
  gridColor: bodyStyles.getPropertyValue('--text-faint').trim(),
  accentColor2HSLA: bodyStyles
    .getPropertyValue('--color-accent-2')
    .trim()
    .replace('hsl', 'hsla')
    .replace(/\)\s*$/, `, 0.6)`),
};

Chart.register( RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend); // Registers chart with chart.js
export const radarView = 'Radar'; /* For registering the chart with obsidian */

export default class MyPlugin extends Plugin {
  async onload() {
    // Tell Obsidian about the new view type that this plugin provides.
    this.registerBasesView(radarView, {
      name: 'Radar',
      icon: 'lucide-radar',
      factory: (controller, containerEl) => {
        return new MyBasesView(controller, containerEl)
      },
	  options: () => ([
		{
			// RANGE sets the maximum value for the radar chart
			type: 'text',
			displayName: 'Range', 
			key: 'range',
			default: 'auto',
		},
		{
			// RADAR DIVISIONS sets the amount of properties to display in the radar view 
			type: 'slider',
			displayName: 'Radar Divisions',
			key: 'divisions',
			default: 6,
			min: 3,
			max: 12
		},
		{
			type: 'slider', 
			displayName: 'Card Width',
			key: 'chartWidth',
			default: 200,
			min: 50, 
			max: 800,
		}
	  ])
    });

  }

  async onunload() {
  }
}

export class MyBasesView extends BasesView implements HoverParent 
{
	hoverPopover: HoverPopover | null;

	readonly type = radarView;
	private containerEl: HTMLElement;
	private gridContainer: HTMLElement;
	cards: RadarCard[] = [];

	private onResizeDebounced: () => void;

	constructor(controller: QueryController, parentEl: HTMLElement) 
	{
		super(controller);
		this.containerEl = parentEl.createDiv('bases-radar-container');
		this.gridContainer = this.containerEl.createDiv('bases-radar-grid');
		this.onResizeDebounced = debounce(this.calculateGridPositions.bind(this), 100, true);
	}

	public onDataUpdated(): void 
	{
		const { app } = this;
		this.destroyCharts();

		/* FETCHING CONFIGURATION OPTIONS */
		const range = parseInt(this.config.get('range') as string);
		const divisions = this.config.get('divisions') as number;
		const chartWidth = this.config.get('chartWidth') as number;

		const theme = this.extractThemeColors(); 
		const order = this.config.getOrder();

		/* ------------------------------ */

		this.cards = this.processData(divisions, range, chartWidth, theme, order);
		this.renderInitialLayout(chartWidth);
	}

	public onResize(): void {
    // Standard Obsidian method that fires when the view pane is resized
    this.onResizeDebounced();
	}

	private chartInstances: Chart[] = [];

	async onClose() {
        this.destroyCharts();
    }

	 private destroyCharts() {
        this.chartInstances.forEach(chart => chart.destroy());
        this.chartInstances = [];
    }

	private extractThemeColors() {
		const bodyStyles = window.getComputedStyle(document.body);

		const bgPrimary = bodyStyles.getPropertyValue('--background-primary').trim();
		const bgSecondary = bodyStyles.getPropertyValue('--background-secondary').trim();
		const accentColor1 = bodyStyles.getPropertyValue('--color-accent-1').trim();
		const accentColor2 = bodyStyles.getPropertyValue('--color-accent-2').trim();
		const gridColor = bodyStyles.getPropertyValue('--text-faint').trim();
		const textMuted = bodyStyles.getPropertyValue('--text-muted').trim();

		return {bgPrimary, bgSecondary, accentColor1, accentColor2, gridColor, textMuted};
	}

	private processData(
		divisions: number,
		range: number,
		width: number,
		theme: any,
		order: (`note.${string}` | `formula.${string}` | `file.${string}`)[]
	): RadarCard[] {
		const processedCards: RadarCard[] = [];

		for (const group of this.data.groupedData) { // Groups from the 'Sort and Group' panel
			for (const entry of group.entries) { // Each entry is one note
				// TODO: Add group handling logic
				
				// 1. Process data into information
				const radarLabels: string[] = [];
				const radarData: number[] = [];
				const listItems: any[] = [];
				let i = 0;

				for (const propertyName of order) {
					const { type, name } = parsePropertyId(propertyName);
					const value = entry.getValue(propertyName);
					
					
					if ((i < divisions) && (!isNaN(Number(value)))) {
						radarLabels.push(name);
						radarData.push(Number(value));
						i++;
					} else {
						listItems.push({
							name: name,
							value: value != null ? value.toString() : "",
							// add a set of type-checks that determines the data type needed to be displayed
						});
					}
				}

				// 2. Setup Chart Config
				const data = {
					labels: radarLabels,
					datasets: [{
						label: '',
						data: radarData as any,
						fill: true,
						backgroundColor: `hsla(${interfaceColors.accentColor}, 0.2)`,
						borderColor: interfaceColors.accentColor2HSLA,
					}]
				}
				const config: ChartConfiguration = {
					type: 'radar', 
					data: {
						labels: radarLabels, 
						datasets: [{
							label: '', 
							data: radarData, 
							fill: true, 
							backgroundColor: theme.accentColor1,
							borderColor: theme.borderColor,
						}]
					},
					options: {
						responsive: true,
						animation: false,
						maintainAspectRatio: false,
						scales: {
							r: {
								min: 0,
								max: isNaN(range) ? undefined : range,
								grid: { color: theme.gridColor},
								angleLines: { color: theme.gridColor },
								ticks: {
									display: true,
									showLabelBackdrop: false,
									color: theme.textMuted,
									stepSize: isNaN(range) ? undefined : Math.ceil(range / 5),
								}
							}
						}, 
						plugins: {
							legend: { display: false },
						}
					}
				};
				
				// 3. Push to our State Array
				processedCards.push({
					id: Math.random().toString(), 
					chartConfig: config, // Stores all charted properties
					listItems: listItems, // Stores all other properties
					layout: { x: 0, y: 0, width: width, height: 0 } // Sets up the basic layout data
				});
			}
		}
		return processedCards;
	}

	private renderInitialLayout(chartWidth: number) {

		if (!this.gridContainer) return; // Check if it exists first
        this.gridContainer.empty(); // Only empty the grid, not the whole view

		this.cards.forEach((card, index) => {
            const cardEl = this.gridContainer!.createDiv('bases-radar-item');
				card.el = cardEl;
            
            // Store the ID in the DOM for easy lookup later
            cardEl.dataset.id = card.id;

				const canvasContainer = cardEl.createEl('div', {cls: 'radar-chart-container'})
				const canvas = canvasContainer.createEl('canvas', { cls: 'bases-radar-chart' });
            new Chart(canvas, card.chartConfig);

				card.listItems.forEach(prop => {
                const propEl = cardEl.createDiv('bases-radar-property');

					// Here is where we would add special handling for specific types 

                propEl.createDiv({ cls: 'bases-radar-label', text: prop.name });
                propEl.createDiv({ cls: 'bases-radar-line', text: prop.value });
            });
        });

		  requestAnimationFrame(() => {
            this.calculateGridPositions();
        });
	}
	private calculateGridPositions() {
		if (!this.gridContainer) return;

		const containerWidth = this.gridContainer.clientWidth;

		const minChartWidth = this.config.get('chartWidth') as number; 
		const gap = 12;

		let colCount = Math.floor((containerWidth + gap) / (minChartWidth + gap));
		colCount = Math.max(1, colCount); // Safety: Always at least 1 column
		const realChartWidth = (containerWidth - ((colCount - 1) * gap)) / colCount;

		const startOffset = 0;

		const firstCard = this.cards[0];
		if (!firstCard || !firstCard.el) return;
		
		for (const card of this.cards) {if (card.el) card.el.style.width = `${realChartWidth}px`;} // Width-setting loop
	 
		const cardHeight = firstCard.el.offsetHeight;
		const rowHeight = cardHeight + gap;

        // THE LOOP

		  for (let i = 0; i < this.cards.length; i++) {
        const card = this.cards[i];
        if (!card.el) continue;

        const colIndex = i % colCount;
        const rowIndex = (i - colIndex) / colCount; // Integer math trick

        const x = colIndex * (realChartWidth + gap);
        const y = rowIndex * rowHeight;

        card.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

		const totalRows = Math.ceil(this.cards.length / colCount);
		const containerHeight = totalRows * (cardHeight + gap);
		this.gridContainer.style.height = `${containerHeight}px`;
   }
}