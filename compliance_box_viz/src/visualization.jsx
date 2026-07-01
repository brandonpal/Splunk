/*
 * Compliance Box Visualization (Dashboard Studio)
 * Renders a single centered title above a single centered number/value inside
 * a configurable box (border color/size/radius, background color).
 */
import React from 'react';

const VALUE_CANDIDATES = ['value', 'metricvalue', 'count', 'compliance', 'compliance_pct', 'percent', 'pct'];

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

function formatValue(raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return raw.toString();
    return Number.isInteger(num) ? num.toString() : num.toLocaleString('en-US');
}

function ComplianceBox(props) {
    const { options, dataSources } = props;

    const extracted = extractRow(dataSources);
    let displayValue = '';
    if (extracted) {
        const { fields, row } = extracted;
        const lower = fields.map((f) => f.toLowerCase());
        let valueIdx = resolveField(lower, options.valueField, VALUE_CANDIDATES);
        if (valueIdx === -1) valueIdx = 0;
        displayValue = formatValue(row[valueIdx]);
    }

    const showPercent = options.showPercent !== false;
    const valueText = displayValue === '' ? '' : `${displayValue}${showPercent ? '%' : ''}`;

    const containerStyle = {
        ...styles.container,
        backgroundColor: options.backgroundColor,
        borderColor: options.borderColor,
        borderWidth: `${options.borderWidth}px`,
        borderRadius: `${options.borderRadius}px`,
    };

    return (
        <div style={containerStyle}>
            {options.titleText ? (
                <span
                    style={{
                        fontSize: `${options.titleFontSize}px`,
                        fontWeight: 700,
                        color: options.titleColor,
                        textAlign: 'center',
                    }}
                >
                    {options.titleText}
                </span>
            ) : null}
            {valueText ? (
                <span
                    style={{
                        fontSize: `${options.valueFontSize}px`,
                        fontWeight: 700,
                        color: options.valueColor,
                        textAlign: 'center',
                    }}
                >
                    {valueText}
                </span>
            ) : null}
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        borderStyle: 'solid',
    },
};

ComplianceBox.config = {
    key: 'compliance_box_viz.compliance_box',
    name: 'Compliance Box',
    category: 'Single Value',
    dataContract: {
        requiredDataSources: ['primary'],
    },
    size: {
        initialWidth: 220,
        initialHeight: 140,
    },
    optionsSchema: {
        titleText: {
            description: 'Title text shown above the number.',
            type: 'string',
            default: 'TITLE',
        },
        titleColor: {
            description: 'Color of the title text.',
            type: 'string',
            default: '#898989',
        },
        titleFontSize: {
            description: 'Font size, in pixels, of the title text.',
            type: 'number',
            default: 13,
        },
        valueField: {
            description: 'Field holding the value to display. Leave blank to auto-detect (first field).',
            type: 'string',
        },
        showPercent: {
            description: 'Append a "%" symbol after the value.',
            type: 'boolean',
            default: true,
        },
        valueColor: {
            description: 'Color of the value text.',
            type: 'string',
            default: '#003D82',
        },
        valueFontSize: {
            description: 'Font size, in pixels, of the value text.',
            type: 'number',
            default: 32,
        },
        borderColor: {
            description: 'Color of the box border.',
            type: 'string',
            default: '#D8D8D8',
        },
        borderWidth: {
            description: 'Width, in pixels, of the box border.',
            type: 'number',
            default: 1,
        },
        borderRadius: {
            description: 'Corner radius, in pixels, of the box (0 for square corners).',
            type: 'number',
            default: 4,
        },
        backgroundColor: {
            description: 'Background color of the box.',
            type: 'string',
            default: '#FFFFFF',
        },
    },
    editorConfig: [
        {
            label: 'Compliance Box: Title',
            layout: [
                [{ label: 'Title text', option: 'titleText', editor: 'editor.text' }],
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
            ],
        },
        {
            label: 'Compliance Box: Number',
            layout: [
                [{ label: 'Value field (blank = auto)', option: 'valueField', editor: 'editor.text' }],
                [{ label: 'Show % sign', option: 'showPercent', editor: 'editor.checkbox' }],
                [
                    {
                        label: 'Value color',
                        option: 'valueColor',
                        editor: 'editor.color',
                        editorProps: { labelPosition: 'top' },
                    },
                    {
                        label: 'Value font size (px)',
                        option: 'valueFontSize',
                        editor: 'editor.number',
                        editorProps: { min: 8, max: 96, labelPosition: 'top' },
                    },
                ],
            ],
        },
        {
            label: 'Compliance Box: Border & Background',
            layout: [
                [
                    {
                        label: 'Border color',
                        option: 'borderColor',
                        editor: 'editor.color',
                        editorProps: { labelPosition: 'top' },
                    },
                    {
                        label: 'Border width (px)',
                        option: 'borderWidth',
                        editor: 'editor.number',
                        editorProps: { min: 0, max: 20, labelPosition: 'top' },
                    },
                ],
                [
                    {
                        label: 'Corner radius (px)',
                        option: 'borderRadius',
                        editor: 'editor.number',
                        editorProps: { min: 0, max: 100, labelPosition: 'top' },
                    },
                    {
                        label: 'Background color',
                        option: 'backgroundColor',
                        editor: 'editor.color',
                        editorProps: { labelPosition: 'top' },
                    },
                ],
            ],
        },
    ],
};

export default ComplianceBox;
