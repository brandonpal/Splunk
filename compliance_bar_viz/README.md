# Compliance Bar Visualization

A custom Splunk visualization for Simple XML / Classic dashboards. Each instance renders a blue title, a "compliant of total (P%)" count line, a colored status pill, and a horizontal bar that fills left-to-right colored red/yellow/green by a threshold field.

## Installation

1. Package the app:
   ```
   tar -czf compliance_bar_viz.tar.gz compliance_bar_viz
   ```
2. In Splunk Web: **Apps → Manage Apps → Install app from file** → upload the archive.
3. Restart Splunk if prompted.

## Usage

Reference this viz in dashboard XML as `viz_type="compliance_bar_viz.compliance_bar"`.

Each panel's search must return **one row** with these fields:

| Field          | Meaning                              |
|----------------|--------------------------------------|
| `metricValue`  | Compliance % (0–100)                 |
| `threshold`    | `red`, `yellow`, or `green`          |
| `compliant`    | Compliant asset count                |
| `noncompliant` | Non-compliant asset count            |

Example SPL:
```spl
index=vuln_mgmt sourcetype=compliance_report platform="BBC (On-Prem)"
| stats latest(metricValue) as metricValue
        latest(threshold) as threshold
        latest(compliant) as compliant
        latest(noncompliant) as noncompliant
```

Set the title via the **General** section of the visualization's format drawer: enter static `Title` text, or pick a `Title field` to use that field's value from the row instead. The title is never guessed from the data.

## Field auto-detection

The visualization tolerates variant field names (case-insensitive) for the compliance, threshold, and count fields. It tries candidate names in priority order before falling back to value scanning or position-based guesses. See the brief for the full candidate list.

## Configuration drawer

Open the visualization's format drawer (the paintbrush/format icon on the panel) to configure:

- **General** — `Title` text and an optional `Title field` override.
- **Field Mapping** — override auto-detected fields for compliance %, threshold, compliant count, and non-compliant count.
- **Threshold Colors** — comma-separated values that map to red/yellow/green, plus a color picker for each threshold's actual fill/accent color.
