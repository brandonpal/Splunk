/*
 * Compliance Bar Visualization
 * Renders one labeled, horizontal progress bar per panel: label + "N of M (P%)"
 * count + a status pill on top, a colored track filled left-to-right below.
 * Color is driven by a threshold field (red / yellow / green).
 *
 * Intended use: one panel/search per row (e.g. one per platform), each bound
 * to its own instance of this visualization, stacked in the dashboard.
 */
define([
            'jquery',
            'underscore',
            'api/SplunkVisualizationBase',
            'api/SplunkVisualizationUtils'
        ],
        function(
            $,
            _,
            SplunkVisualizationBase,
            vizUtils
        ) {

    var COLOR_MAP = {
        'red':    { fill: '#C13B3B', text: '#C13B3B' },
        'yellow': { fill: '#E8821D', text: '#E8821D' },
        'amber':  { fill: '#E8821D', text: '#E8821D' },
        'green':  { fill: '#5FA864', text: '#3F7D43' }
    };
    var DEFAULT_COLOR = { fill: '#999999', text: '#666666' };

    var LABEL_FIELD_CANDIDATES = ['label', 'name', 'platform', 'asset_type', 'category'];
    var THRESHOLD_FIELD_CANDIDATES = ['threshold', 'status', 'color', 'colour'];
    var NUMERATOR_FIELD_CANDIDATES = ['compliant', 'numerator', 'compliant_count', 'count'];
    var DENOMINATOR_FIELD_CANDIDATES = ['denominator', 'total', 'total_count', 'asset_count'];
    var NONCOMPLIANT_FIELD_CANDIDATES = ['noncompliant', 'non_compliant', 'non-compliant', 'noncompliant_count'];
    var COMPLIANCE_FIELD_CANDIDATES = ['metricvalue', 'compliance', 'compliance_pct', 'percent', 'pct', 'value'];

    function findByName(fields, candidates) {
        var lowerFields = fields.map(function(f) { return f.toLowerCase(); });
        for (var i = 0; i < candidates.length; i++) {
            var idx = lowerFields.indexOf(candidates[i]);
            if (idx > -1) {
                return idx;
            }
        }
        return -1;
    }

    function findThresholdByValue(row) {
        for (var i = 0; i < row.length; i++) {
            var v = (row[i] || '').toString().toLowerCase().trim();
            if (COLOR_MAP[v]) {
                return i;
            }
        }
        return -1;
    }

    function formatNumber(n) {
        if (isNaN(n)) {
            return n;
        }
        return Number(n).toLocaleString('en-US');
    }

    return SplunkVisualizationBase.extend({

        initialize: function() {
            SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
            this.$el = $(this.el);
            this.$el.addClass('compliance-bar-viz');
        },

        getInitialDataParams: function() {
            return ({
                outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
                count: 1
            });
        },

        formatData: function(data) {
            var rows = data.rows;
            if (!rows || rows.length === 0) {
                throw new SplunkVisualizationBase.VisualizationError(
                    'No results to display. The search must return at least one row.'
                );
            }

            var fields = _.map(data.fields, function(f) { return f.name; });
            var row = rows[0];

            var thresholdIdx = findByName(fields, THRESHOLD_FIELD_CANDIDATES);
            if (thresholdIdx === -1) {
                thresholdIdx = findThresholdByValue(row);
            }

            var labelIdx = findByName(fields, LABEL_FIELD_CANDIDATES);
            if (labelIdx === -1) {
                // fall back to the first field that isn't the threshold field and isn't purely numeric
                for (var i = 0; i < row.length; i++) {
                    if (i !== thresholdIdx && isNaN(parseFloat(row[i]))) {
                        labelIdx = i;
                        break;
                    }
                }
            }

            var numeratorIdx = findByName(fields, NUMERATOR_FIELD_CANDIDATES);
            var denominatorIdx = findByName(fields, DENOMINATOR_FIELD_CANDIDATES);
            var noncompliantIdx = findByName(fields, NONCOMPLIANT_FIELD_CANDIDATES);
            var complianceIdx = findByName(fields, COMPLIANCE_FIELD_CANDIDATES);

            var numerator = numeratorIdx > -1 ? parseFloat(row[numeratorIdx]) : NaN;
            var noncompliant = noncompliantIdx > -1 ? parseFloat(row[noncompliantIdx]) : NaN;

            var denominator;
            if (denominatorIdx > -1) {
                denominator = parseFloat(row[denominatorIdx]);
            } else if (!isNaN(numerator) && !isNaN(noncompliant)) {
                denominator = numerator + noncompliant;
            } else {
                denominator = NaN;
            }

            var compliance;
            if (complianceIdx > -1) {
                compliance = parseFloat(row[complianceIdx]);
            } else if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
                compliance = (numerator / denominator) * 100;
            } else {
                compliance = NaN;
            }
            compliance = isNaN(compliance) ? 0 : Math.max(0, Math.min(100, compliance));

            var threshold = thresholdIdx > -1
                ? (row[thresholdIdx] || '').toString().toLowerCase().trim()
                : '';

            var label = labelIdx > -1 ? row[labelIdx] : '';

            var hasCounts = !isNaN(numerator) && !isNaN(denominator);

            return {
                label: label,
                compliance: compliance,
                threshold: threshold,
                hasCounts: hasCounts,
                numerator: numerator,
                denominator: denominator,
                thresholdFieldName: thresholdIdx > -1 ? fields[thresholdIdx] : null
            };
        },

        updateView: function(d, config) {
            var compliance = d.compliance;
            var roundedPct = Math.round(compliance);
            var colors = COLOR_MAP[d.threshold] || DEFAULT_COLOR;

            this.$el.empty();

            var $row = $('<div class="cbv-row"></div>');

            var $header = $('<div class="cbv-header"></div>');
            if (d.label) {
                $header.append($('<span class="cbv-label"></span>').text(d.label));
            }

            var $meta = $('<span class="cbv-meta"></span>');
            if (d.hasCounts) {
                var countText = formatNumber(d.numerator) + ' of ' + formatNumber(d.denominator) +
                    ' (' + roundedPct + '%)';
                $meta.append($('<span class="cbv-count"></span>').text(countText));
            }

            if (d.threshold && COLOR_MAP[d.threshold]) {
                var $pill = $('<span class="cbv-pill"></span>')
                    .text(d.threshold.toUpperCase())
                    .css({
                        color: colors.text,
                        borderColor: colors.text
                    });
                $meta.append($pill);
            } else if (d.threshold) {
                var $pillUnknown = $('<span class="cbv-pill cbv-pill-unknown"></span>')
                    .text(d.threshold.toUpperCase());
                $meta.append($pillUnknown);
            }

            $header.append($meta);
            $row.append($header);

            var $track = $('<div class="cbv-track"></div>');
            var $fill = $('<div class="cbv-fill"></div>').css({
                width: roundedPct + '%',
                backgroundColor: colors.fill
            });

            if (roundedPct >= 15) {
                $fill.append($('<span class="cbv-fill-label"></span>').text(roundedPct + '%'));
            }
            $track.append($fill);

            if (roundedPct < 15) {
                var $outsideLabel = $('<span class="cbv-outside-label"></span>')
                    .text(roundedPct + '%')
                    .css({ left: 'calc(' + roundedPct + '% + 8px)' });
                $track.append($outsideLabel);
            }

            $row.append($track);

            if (d.threshold && !COLOR_MAP[d.threshold]) {
                var fieldNote = d.thresholdFieldName ? ('"' + d.thresholdFieldName + '" ') : '';
                $row.append(
                    $('<div class="cbv-hint"></div>').text(
                        'Threshold field ' + fieldNote + 'value "' + d.threshold + '" not recognized (expected red/yellow/green).'
                    )
                );
            }

            this.$el.append($row);

            return this;
        },

        reflow: function() {
            // Percentage-based CSS handles resizing; nothing to do here.
        },

        getStyles: function() {
            return null;
        }
    });
});
