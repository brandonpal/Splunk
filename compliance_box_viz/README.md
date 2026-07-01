# Compliance Box Visualization

A custom **Dashboard Studio** visualization. Each instance renders a single
box with a centered title above a centered number/value — matching a
"COMPLIANT % / 86%" style stat panel.

## Building

The visualization body ships as a prebuilt bundle at
`appserver/static/visualizations/compliance_box/visualization.js`, so no build
step is required to install the app as-is. To make source changes:

```
npm install
npm run build
```

This compiles `src/visualization.jsx` with webpack into
`appserver/static/visualizations/compliance_box/visualization.js`. Commit the
rebuilt bundle along with any source changes — Splunk loads that file
directly and does not run a build step itself.

## Installation

1. Package the app:
   ```
   tar -czf compliance_box_viz.tar.gz compliance_box_viz
   ```
2. In Splunk Web: **Apps → Manage Apps → Install app from file** → upload the archive.
3. Restart Splunk if prompted.

## Usage

Add the visualization to a Dashboard Studio dashboard (viz type
`compliance_box_viz.compliance_box`) and bind a search that returns **one row** with the
value to display. All configuration is available in the visualization's
configuration panel ("Compliance Box: Title", "Compliance Box: Number", "Compliance Box:
Border & Background" sections), no source-code editing needed.

By default, the value is read from the first field returned by the search.
Set **Value field** in the "Compliance Box: Number" section to target a specific
field by name (case-insensitive), or leave it blank to auto-detect common
field names (`value`, `metricvalue`, `count`, `compliance`, `compliance_pct`,
`percent`, `pct`) before falling back to the first field.

Example SPL:
```spl
index=vuln_mgmt sourcetype=compliance_report
| stats latest(metricValue) as value
```

## Configuration options

### Title
- **Title text**: static text shown above the number (e.g. "COMPLIANT %"). Leave blank to hide.
- **Title color** / **Title font size (px)**.

### Number
- **Value field**: field to read the number from (blank = auto-detect).
- **Show % sign**: append a `%` after the number. Turn off for panels that don't represent a percentage.
- **Value color** / **Value font size (px)**.

### Border & Background
- **Border color** / **Border width (px)**.
- **Corner radius (px)**: set above 0 for rounded corners.
- **Background color**.

Both the title and the number are centered horizontally and vertically
within the box.
