# Compliance Bar Visualization

A custom **Dashboard Studio** visualization. Each instance renders one row: an
optional label, a "compliant of total (P%)" count line, a colored status
pill, and a horizontal bar that fills left-to-right colored red/yellow/green
by a threshold field.

## Building

The visualization body ships as a prebuilt bundle at
`appserver/static/visualizations/compliance_bar/visualization.js`, so no
build step is required to install the app as-is. To make source changes:

```
npm install
npm run build
```

This compiles `src/visualization.jsx` with webpack into
`appserver/static/visualizations/compliance_bar/visualization.js`. Commit the
rebuilt bundle along with any source changes — Splunk loads that file
directly and does not run a build step itself.

## Installation

1. Package the app:
   ```
   tar -czf compliance_bar_viz.tar.gz compliance_bar_viz
   ```
2. In Splunk Web: **Apps → Manage Apps → Install app from file** → upload the archive.
3. Restart Splunk if prompted.

## Usage

Add the visualization to a Dashboard Studio dashboard (viz type
`compliance_bar_viz.compliance_bar`) and bind a search that returns **one
row**. All configuration — field mapping, threshold colors, and the title/count
text style — is available in the visualization's configuration panel
("Compliance Bar: Color and style", "Compliance Bar: Field Mapping",
"Compliance Bar: Threshold Colors" sections), no source-code editing needed.

Default field names it looks for (case-insensitive, overridable per-panel via
the Field Mapping section):

| Field          | Meaning                              |
|----------------|---------------------------------------|
| `metricvalue`  | Compliance % (0–100)                 |
| `threshold`    | `red`, `yellow`, or `green`          |
| `compliant`    | Compliant asset count                |
| `noncompliant` | Non-compliant asset count            |
| `total`        | Total (denominator) asset count      |
| `label`        | Row label                            |

Example SPL:
```spl
index=vuln_mgmt sourcetype=compliance_report platform="BBC (On-Prem)"
| stats latest(metricValue) as metricValue
        latest(threshold) as threshold
        latest(compliant) as compliant
        latest(noncompliant) as noncompliant
        latest(label) as label
```

## Field auto-detection

The visualization tolerates variant field names (case-insensitive). It tries
the configured field name first, then candidate names in priority order,
before falling back to value scanning or position-based guesses. See
`src/visualization.jsx` for the full candidate lists.

## Title / count styling

- **Title** (row label) color and font size: `titleColor` / `titleFontSize`
  options, default `#003D82` / 16px.
- **Count** ("N of M (P%)") color and font size: `countColor` /
  `countFontSize` options, default `#898989` / 11px.

Both are editable per-panel in the "Compliance Bar: Color and style" section
of the configuration drawer.
