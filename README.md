# Obsidian-radar-charts

 A new view for obsidian bases that adds a simple radar chart. Modelled after the obsidian cards view. The goal is to keep it simple, make it usable, and not require any more configuration than other base views. 

 <img src="assets/Radar Chart View.png" alt="The view of the chart" width="600"> 
 <img src="assets/View Configuration.png" alt="The configuration menu for the view" width="600"> 
 <img src="assets/Properties Config.png" alt="The property configuration" width="600">



 
## Installation
As the plugin is not released, installation can be handled via [the BRAT plugin](https://obsidian.md/plugins?id=obsidian42-brat) or by manually copying main.js, styles.css, and manifest.css into a new folder in your obsidian plugins directory. 

## Usage
- In an obsidian base, create a new view and select "Radar" from the layout dropdown
- Select the number of divisions and the range of the charts. Leave the range selector blank to set an automatic range for the charts.
- Add the properties you would like to see in the radar view from the bases's "properties menu"
	- The points on the radar are set from any numerical data (directly from properties or from formulas)
	- All other properties will render below the chart. 
	- If There are more number properties than there are division on the radar chart, they will also render below the chart.
