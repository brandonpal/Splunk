/*
 * Compliance Bar Visualization (Dashboard Studio)
 * Renders one labeled, horizontal progress bar per panel: label + "N of M (P%)"
 * count + a status pill on top, a colored track filled left-to-right below.
 * Color is driven by a threshold field (red / yellow / green).
 */
import React from 'react';

const UNKNOWN_COLOR = { fill: '#999999', text: '#666666' };

const LABEL_CANDIDATES = ['label', 'name', 'platform', 'asset_type', 'category'];
const THRESHOLD_CANDIDATES = ['threshold', 'status', 'color', 'colour'];
const NUMERATOR_CANDIDATES = ['compliant', 'numerator', 'compliant_count', 'count'];
const DENOMINATOR_CANDIDATES = ['denominator', 'total', 'total_count', 'asset_count'];
const NONCOMPLIANT_CANDIDATES = ['noncompliant', 'non_compliant', 'non-compliant', 'noncompliant_count'];
const COMPLIANCE_CANDIDATES = ['metricvalue', 'compliance', 'compliance_pct', 'percent', 'pct', 'value'];

function splitList(raw, defaults) {
    const trimmed = (raw || '').trim();
    if (!trimmed) return defaults;
    return trimmed
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

function buildColorMap(options) {
    const map = {};
    splitList(options.redText, ['red']).forEach((t) => {
        map[t] = { fill: '#C13B3B', text: '#C13B3B' };
    });
    splitList(options.yellowText, ['yellow', 'amber']).forEach((t) => {
        map[t] = { fill: '#E8821D', text: '#E8821D' };
    });
    splitList(options.greenText, ['green']).forEach((t) => {
        map[t] = { fill: '#5FA864', text: '#3F7D43' };
    });
    return map;
}

function resolveField(lowerFields, cfgVal, candidates) {
    if (cfgVal) {
        const exact = lowerFields.indexOf(cfgVal.toLowerCase());
        if (exact > -1) return exact;
    }
    for (let i = 0; i < candidates.length; i += 1) {
        const idx = lowerFields.indexOf(candidates[i]);
        if (idx > -1) return idx;
    }
    return -1;
}

function findThresholdByValue(row, colorMap) {
    for (let i = 0; i < row.length; i += 1) {
        if (colorMap[(row[i] || '').toString().toLowerCase().trim()]) return i;
    }
    return -1;
}

function formatNumber(n) {
    return Number.isNaN(n) ? n : Number(n).toLocaleString('en-US');
}

// dataSources.primary.data is column-major: { fields: [{name}], columns: [[...], [...]] }
function extractRow(dataSources) {
    const cols = dataSources && dataSources.primary && dataSources.primary.data;
    if (!cols || !cols.fields || !cols.fields.length || !cols.columns || !cols.columns[0] || !cols.columns[0].length) {
        return null;
    }
    const fields = cols.fields.map((f) => f.name);
    const row = cols.columns.map((col) => col[0]);
    return { fields, row };
}

function ComplianceBar(props) {
    const { options = {}, dataSources } = props;

    const extracted = extractRow(dataSources);
    if (!extracted) {
        return (
            <div style={styles.container}>
                <div style={styles.hint}>No results to display. The search must return at least one row.</div>
            </div>
        );
    }

    const { fields, row } = extracted;
    const lower = fields.map((f) => f.toLowerCase());
    const colorMap = buildColorMap(options);

    let thresholdIdx = resolveField(lower, options.thresholdField, THRESHOLD_CANDIDATES);
    if (thresholdIdx === -1) thresholdIdx = findThresholdByValue(row, colorMap);

    let labelIdx = resolveField(lower, options.labelField, LABEL_CANDIDATES);
    if (labelIdx === -1) {
        for (let i = 0; i < row.length; i += 1) {
            if (i !== thresholdIdx && Number.isNaN(parseFloat(row[i]))) {
                labelIdx = i;
                break;
            }
        }
    }

    const numeratorIdx = resolveField(lower, options.compliantField, NUMERATOR_CANDIDATES);
    const noncompliantIdx = resolveField(lower, options.noncompliantField, NONCOMPLIANT_CANDIDATES);
    const denominatorIdx = resolveField(lower, options.denominatorField, DENOMINATOR_CANDIDATES);
    const complianceIdx = resolveField(lower, options.complianceField, COMPLIANCE_CANDIDATES);

    const numerator = numeratorIdx > -1 ? parseFloat(row[numeratorIdx]) : NaN;
    const noncompliant = noncompliantIdx > -1 ? parseFloat(row[noncompliantIdx]) : NaN;

    let denominator;
    if (denominatorIdx > -1) {
        denominator = parseFloat(row[denominatorIdx]);
    } else if (!Number.isNaN(numerator) && !Number.isNaN(noncompliant)) {
        denominator = numerator + noncompliant;
    } else {
        denominator = NaN;
    }

    let compliance;
    if (complianceIdx > -1) {
        compliance = parseFloat(row[complianceIdx]);
    } else if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator > 0) {
        compliance = (numerator / denominator) * 100;
    } else {
        compliance = NaN;
    }
    compliance = Number.isNaN(compliance) ? 0 : Math.max(0, Math.min(100, compliance));

    const threshold = thresholdIdx > -1 ? (row[thresholdIdx] || '').toString().toLowerCase().trim() : '';
    const label = labelIdx > -1 ? row[labelIdx] : '';
    const hasCounts = !Number.isNaN(numerator) && !Number.isNaN(denominator);
    const colors = colorMap[threshold] || UNKNOWN_COLOR;
    const roundedPct = Math.round(compliance);
    const isKnownThreshold = !!colorMap[threshold];

    const countText = hasCounts
        ? `${formatNumber(numerator)} of ${formatNumber(denominator)} (${roundedPct}%)`
        : '';

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                {label ? (
                    <span
                        style={{
                            fontSize: `${options.titleFontSize}px`,
                            fontWeight: 700,
                            color: options.titleColor,
                        }}
                    >
                        {label}
                    </span>
                ) : null}
                <span style={styles.meta}>
                    {hasCounts ? (
                        <span
                            style={{
                                fontSize: `${options.countFontSize}px`,
                                color: options.countColor,
                            }}
                        >
                            {countText}
                        </span>
                    ) : null}
                    {threshold ? (
                        <span
                            style={{
                                ...styles.pill,
                                ...(isKnownThreshold
                                    ? { color: colors.text, borderColor: colors.text }
                                    : { color: '#666', borderColor: '#999' }),
                            }}
                        >
                            {threshold.toUpperCase()}
                        </span>
                    ) : null}
                </span>
            </div>

            <div style={styles.track}>
                <div style={{ ...styles.fill, width: `${roundedPct}%`, backgroundColor: colors.fill }}>
                    {roundedPct >= 15 ? <span style={styles.fillLabel}>{`${roundedPct}%`}</span> : null}
                </div>
                {roundedPct < 15 ? (
                    <span style={{ ...styles.outsideLabel, left: `calc(${roundedPct}% + 8px)` }}>{`${roundedPct}%`}</span>
                ) : null}
            </div>

            {threshold && !isKnownThreshold ? (
                <div style={styles.hint}>
                    {`Threshold field ${thresholdIdx > -1 ? `"${fields[thresholdIdx]}" ` : ''}value "${threshold}" not recognized ` +
                        `(expected: ${Object.keys(colorMap).join(', ') || 'none configured'}).`}
                </div>
            ) : null}
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '12px 4px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        backgroundColor: 'transparent',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginLeft: 'auto',
    },
    pill: {
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '3px 14px',
        borderRadius: 999,
        border: '1.5px solid #999',
        backgroundColor: '#fff',
        whiteSpace: 'nowrap',
    },
    track: {
        position: 'relative',
        width: '100%',
        height: 26,
        backgroundColor: '#E9E9EC',
        borderRadius: 4,
        overflow: 'visible',
    },
    fill: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 4,
        transition: 'width 0.4s ease, background-color 0.4s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        boxSizing: 'border-box',
        minWidth: 0,
        overflow: 'hidden',
    },
    fillLabel: {
        fontSize: 12,
        fontWeight: 700,
        color: '#ffffff',
        paddingRight: 10,
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
        whiteSpace: 'nowrap',
    },
    outsideLabel: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 12,
        fontWeight: 700,
        color: '#555',
        whiteSpace: 'nowrap',
    },
    hint: {
        marginTop: 6,
        fontSize: 10,
        color: '#C13B3B',
    },
};

ComplianceBar.config = {
    key: 'compliance_bar_viz.compliance_bar',
    name: 'Compliance Bar',
    category: 'Custom',
    dataContract: {
        requiredDataSources: ['primary'],
    },
    size: {
        initialWidth: 400,
        initialHeight: 90,
    },
    optionsSchema: {
        complianceField: {
            description: 'Field holding the pre-computed compliance percentage. Leave blank to auto-detect or derive from compliant/denominator fields.',
            type: 'string',
        },
        thresholdField: {
            description: 'Field holding the red/yellow/green threshold value. Leave blank to auto-detect.',
            type: 'string',
        },
        compliantField: {
            description: 'Field holding the compliant (numerator) count. Leave blank to auto-detect.',
            type: 'string',
        },
        noncompliantField: {
            description: 'Field holding the non-compliant count, used to derive the denominator if no total field exists. Leave blank to auto-detect.',
            type: 'string',
        },
        denominatorField: {
            description: 'Field holding the total (denominator) count. Leave blank to auto-detect or derive from compliant/non-compliant fields.',
            type: 'string',
        },
        labelField: {
            description: 'Field holding the row label. Leave blank to auto-detect.',
            type: 'string',
        },
        redText: {
            description: 'Comma-separated, case-insensitive threshold values that should render red. Defaults to "red".',
            type: 'string',
        },
        yellowText: {
            description: 'Comma-separated, case-insensitive threshold values that should render yellow/amber. Defaults to "yellow, amber".',
            type: 'string',
        },
        greenText: {
            description: 'Comma-separated, case-insensitive threshold values that should render green. Defaults to "green".',
            type: 'string',
        },
        titleColor: {
            description: 'Color of the row label text.',
            type: 'string',
            default: '#003D82',
        },
        titleFontSize: {
            description: 'Font size, in pixels, of the row label text.',
            type: 'number',
            default: 16,
        },
        countColor: {
            description: 'Color of the "N of M (P%)" count text.',
            type: 'string',
            default: '#898989',
        },
        countFontSize: {
            description: 'Font size, in pixels, of the "N of M (P%)" count text.',
            type: 'number',
            default: 11,
        },
    },
    editorConfig: [
        {
            label: 'Compliance Bar: Color and style',
            layout: [
                [
                    {
                        label: 'Title color',
                        option: 'titleColor',
                        editor: 'editor.color',
                        editorProps: { labelPosition: 'top' },
                    },
                    {
                        label: 'Title font size (px)',
                        option: 'titleFontSize',
                        editor: 'editor.number',
                        editorProps: { min: 8, max: 48, labelPosition: 'top' },
                    },
                ],
                [
                    {
                        label: 'Count color',
                        option: 'countColor',
                        editor: 'editor.color',
                        editorProps: { labelPosition: 'top' },
                    },
                    {
                        label: 'Count font size (px)',
                        option: 'countFontSize',
                        editor: 'editor.number',
                        editorProps: { min: 8, max: 48, labelPosition: 'top' },
                    },
                ],
            ],
        },
        {
            label: 'Compliance Bar: Field Mapping',
            layout: [
                [{ label: 'Compliance % field', option: 'complianceField', editor: 'editor.text' }],
                [{ label: 'Threshold field', option: 'thresholdField', editor: 'editor.text' }],
                [{ label: 'Compliant count field', option: 'compliantField', editor: 'editor.text' }],
                [{ label: 'Non-compliant count field', option: 'noncompliantField', editor: 'editor.text' }],
                [{ label: 'Total (denominator) field', option: 'denominatorField', editor: 'editor.text' }],
                [{ label: 'Label field', option: 'labelField', editor: 'editor.text' }],
            ],
        },
        {
            label: 'Compliance Bar: Threshold Colors',
            layout: [
                [{ label: 'Red values', option: 'redText', editor: 'editor.text' }],
                [{ label: 'Yellow / amber values', option: 'yellowText', editor: 'editor.text' }],
                [{ label: 'Green values', option: 'greenText', editor: 'editor.text' }],
            ],
        },
    ],
};

export default ComplianceBar;
