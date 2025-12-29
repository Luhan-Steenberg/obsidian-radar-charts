import {App, Editor, MarkdownView, Modal, Notice, Plugin, QueryController, BasesView, parsePropertyId, HoverPopover, HoverParent, NumberValue} from 'obsidian';
/* import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
 */
import {Chart, ChartConfiguration, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

Chart.register( RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export const radarView = 'Radar';

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
			displayName: 'Radar Chart Width',
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

	constructor(controller: QueryController, parentEl: HTMLElement) 
	{
		super(controller);
		this.containerEl = parentEl.createDiv('bases-radar-container');
	}

	public onDataUpdated(): void 
	{
		const { app } = this;
		const order = this.config.getOrder();

		this.containerEl.empty(); // I would like to not rely on this I think

		const radarContainer = this.containerEl;
		const containerWidth = this.config.get('chartWidth') as number;

		for (const group of this.data.groupedData) 
		{ // Handles the "grouping" of entries through the bases view. If no groups set; returns one group
			
			// TODO: Handling for group headers

			const cardsGrid = radarContainer.createDiv('bases-radar-grid');

			for (const entry of group.entries) 
			{ // Each group.entries is each row in the bases view (ie. one note)
				
				const cardItem = cardsGrid.createDiv('bases-radar-item');
				
				const canvas = cardItem.createEl('canvas', { 
                    cls: 'bases-radar-chart' 
				});
				canvas.width = containerWidth;

				const divisions = this.config.get('divisions') as number;

				let radarLabels: string[] = [];
				let radarData: number[] = [];
				let i = 0;

				for (const propertyName of order) 
				{
					const { type, name } = parsePropertyId(propertyName);
					const value = entry.getValue(propertyName);
					
					if (i < divisions)
					{
						// Coerce value to a number; many Obsidian value types are primitives at runtime
						const numeric = Number(value);
						if (!isNaN(numeric))
						{
							radarLabels.push(name);
							radarData.push(numeric);
							i++;
						} else {
							createRadarProperty(cardItem, name, value, type);
						}
					} else {
						createRadarProperty(cardItem, name, value, type);
					}
				}

				let range = parseInt(this.config.get('range') as string);

				// FETCHING THEME COLORS TO STYLE THE CHART
				var bodyStyles = window.getComputedStyle(document.body);
				var bgPrimary = bodyStyles.getPropertyValue('--background-primary').trim();
				var bgSecondary = bodyStyles.getPropertyValue('--background-secondary').trim();
				var accentColor = bodyStyles.getPropertyValue('--color-accent-hsl').trim();
				var accentColor1 = bodyStyles.getPropertyValue('--color-accent-1').trim();
				var accentColor2 = bodyStyles.getPropertyValue('--color-accent-2').trim();
				var gridColor = bodyStyles.getPropertyValue('--text-faint').trim();

				// Adding opacity to accentColor2 because it is returned as an HSL calculation
				let accentColor2HSLA = accentColor2
					.replace("hsl", "hsla")
					.replace(/\)\s*$/, `, 0.6)`);

				const data = {
					labels: radarLabels,
					datasets: [{
						label: 'Count',
						data: radarData as any,
						fill: true,
						backgroundColor: `hsla(${accentColor}, 0.2)`,
						borderColor: accentColor2HSLA,
					}]
				}
				const config: ChartConfiguration = {
					type: 'radar', 
					data: data,
					options: {
						responsive: true,
						animation: false,
						scales: {
							r: {
								min: 0,
								max: range,
								grid: {
									color: gridColor + '66',
								},
								angleLines: {
									color: gridColor + '66',
								},
								ticks: {
									display: true,
									showLabelBackdrop: false,
									color: gridColor,
									stepSize: isNaN(range) ? undefined : Math.ceil(range / 5),
								}
							}
						}, 
						plugins: {
							legend: {
								display: false
							}
						}
					}
				}
			
				if (isNaN(range)){
					config.options!.scales!.r!.max = undefined;
				}
				
				new Chart(canvas, config);

			}
		}
	}
}

/**
 * Creates a radar property element.
 * @param {HTMLElement} container - The parent element to append to (e.g., cardItem).
 * @param {string} name - The label text for the property.
 * @param {any} value - The value to display.
 * @param {string} type - The type of item (used for conditional styling).
 */
function createRadarProperty(container:HTMLElement, name, value, type) {
	const propEl = container.createDiv('bases-radar-property');

	propEl.createDiv({
		cls: 'bases-radar-label',
		text: name
	});

	const lineEl = propEl.createDiv('bases-radar-line');

	// specific check to ensure null/undefined doesn't print "null"
	if(value == 'null')
	{
		lineEl.setText('–');
		lineEl.addClass('null-value');
	} else {
		lineEl.setText(value.toString()); 
	}

	// Conditional styling logic
	if (name === 'name' && type === 'file') {
		propEl.addClass('mod-title');
	}
	
	// TODO: Add handling for tags, multitext lists, long	text list with ...

	return propEl; // Returning the element is useful if you need to modify it further later
}
