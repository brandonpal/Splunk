/*
 * Compliance Bar Visualization
 * Renders one titled, horizontal progress bar per panel: a blue title, then
 * a "N of M (P%)" count + a status pill on top, a colored track filled
 * left-to-right below. Color is driven by a threshold field (red / yellow /
 * green). The title comes from the General config (static text, or a field
 * override) — it is never guessed from the data.
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

    var PROP_NS = 'display.visualizations.custom.compliance_bar_viz.compliance_bar.';

    var UNKNOWN_COLOR = { fill: '#999999', text: '#666666' };

    var THRESHOLD_CANDIDATES    = ['threshold', 'status', 'color', 'colour'];
    var NUMERATOR_CANDIDATES    = ['compliant', 'numerator', 'compliant_count', 'count'];
    var DENOMINATOR_CANDIDATES  = ['denominator', 'total', 'total_count', 'asset_count'];
    var NONCOMPLIANT_CANDIDATES = ['noncompliant', 'non_compliant', 'non-compliant', 'noncompliant_count'];
    var COMPLIANCE_CANDIDATES   = ['metricvalue', 'compliance', 'compliance_pct', 'percent', 'pct', 'value'];

    // Build the threshold→color map from config text inputs.
    // Each input is a comma-separated list of text values that map to that color.
    // Fill/text colors are also configurable (default to the historical hues).
    function buildColorMap(config) {
        function texts(key, defaults) {
            var raw = (config[PROP_NS + key] || '').trim();
            if (!raw) return defaults;
            return raw.split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(Boolean);
        }
        function hex(key, fallback) {
            var raw = (config[PROP_NS + key] || '').trim();
            return raw || fallback;
        }
        var redColor    = hex('redColor',    '#C13B3B');
        var yellowColor = hex('yellowColor', '#E8821D');
        var greenColor  = hex('greenColor',  '#5FA864');

        var map = {};
        texts('redText',    ['red']).forEach(function(t) {
            map[t] = { fill: redColor, text: redColor };
        });
        texts('yellowText', ['yellow', 'amber']).forEach(function(t) {
            map[t] = { fill: yellowColor, text: yellowColor };
        });
        texts('greenText',  ['green']).forEach(function(t) {
            map[t] = { fill: greenColor, text: greenColor };
        });
        return map;
    }

    // Return the index of `cfgVal` in lowerFields, or fall back to candidate scanning.
    function resolveField(lowerFields, cfgVal, candidates) {
        if (cfgVal) {
            var exact = lowerFields.indexOf(cfgVal.toLowerCase());
            if (exact > -1) return exact;
        }
        for (var i = 0; i < candidates.length; i++) {
            var idx = lowerFields.indexOf(candidates[i]);
            if (idx > -1) return idx;
        }
        return -1;
    }

    // Scan row values to find a field whose value is a recognized threshold word.
    function findThresholdByValue(row, colorMap) {
        for (var i = 0; i < row.length; i++) {
            if (colorMap[(row[i] || '').toString().toLowerCase().trim()]) return i;
        }
        return -1;
    }

    function formatNumber(n) {
        return isNaN(n) ? n : Number(n).toLocaleString('en-US');
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

        // formatData only validates and extracts the raw row. All config-aware
        // resolution happens in updateView where config is available.
        formatData: function(data) {
            if (!data.rows || data.rows.length === 0) {
                throw new SplunkVisualizationBase.VisualizationError(
                    'No results to display. The search must return at least one row.'
                );
            }
            var fields = _.map(data.fields, function(f) { return f.name; });
            // Expose field list for the formatter's field-picker dropdowns.
            // The formatter may be in a child iframe, so write to several levels.
            try { window._cbvFields = fields; } catch (e) {}
            try { window.parent._cbvFields = fields; } catch (e) {}
            return { fields: fields, row: data.rows[0] };
        },

        updateView: function(d, config) {
            var fields = d.fields;
            var row    = d.row;
            var lower  = fields.map(function(f) { return f.toLowerCase(); });

            var colorMap = buildColorMap(config);

            // --- Field resolution (config override → name match → value scan) ---
            var thresholdIdx = resolveField(lower, config[PROP_NS + 'thresholdField'], THRESHOLD_CANDIDATES);
            if (thresholdIdx === -1) thresholdIdx = findThresholdByValue(row, colorMap);

            // Title never falls back to guessing from data. It's either the static
            // "Title" config text, or the value of an explicitly configured
            // "Title field" override (General tab in the config drawer).
            var titleFieldIdx = resolveField(lower, config[PROP_NS + 'titleField'], []);

            var numeratorIdx    = resolveField(lower, config[PROP_NS + 'compliantField'],    NUMERATOR_CANDIDATES);
            var noncompliantIdx = resolveField(lower, config[PROP_NS + 'noncompliantField'], NONCOMPLIANT_CANDIDATES);
            var denominatorIdx  = resolveField(lower, config[PROP_NS + 'denominatorField'],  DENOMINATOR_CANDIDATES);
            var complianceIdx   = resolveField(lower, config[PROP_NS + 'complianceField'],   COMPLIANCE_CANDIDATES);

            // --- Value extraction ---
            var numerator    = numeratorIdx    > -1 ? parseFloat(row[numeratorIdx])    : NaN;
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

            var threshold  = thresholdIdx > -1 ? (row[thresholdIdx] || '').toString().toLowerCase().trim() : '';
            var title      = (titleFieldIdx > -1 && row[titleFieldIdx] !== '' && row[titleFieldIdx] != null) ?
                                  row[titleFieldIdx] : (config[PROP_NS + 'title'] || '');
            var hasCounts  = !isNaN(numerator) && !isNaN(denominator);
            var colors     = colorMap[threshold] || UNKNOWN_COLOR;
            var roundedPct = Math.round(compliance);

            // --- Render ---
            this.$el.empty();

            var $row = $('<div class="cbv-row"></div>');

            if (title) {
                $row.append($('<div class="cbv-title"></div>').text(title));
            }

            var $header = $('<div class="cbv-header"></div>');

            var $meta = $('<span class="cbv-meta"></span>');
            if (hasCounts) {
                var countText = formatNumber(numerator) + ' of ' + formatNumber(denominator) +
                    ' (' + roundedPct + '%)';
                $meta.append($('<span class="cbv-count"></span>').text(countText));
            }

            if (threshold) {
                var isKnown = !!colorMap[threshold];
                var $pill = $('<span class="cbv-pill"></span>')
                    .text(threshold.toUpperCase())
                    .toggleClass('cbv-pill-unknown', !isKnown);
                if (isKnown) $pill.css({ color: colors.text, borderColor: colors.text });
                $meta.append($pill);
            }

            $header.append($meta);
            $row.append($header);

            var $track = $('<div class="cbv-track"></div>');
            var $fill  = $('<div class="cbv-fill"></div>').css({
                width: roundedPct + '%',
                backgroundColor: colors.fill
            });

            if (roundedPct >= 15) {
                $fill.append($('<span class="cbv-fill-label"></span>').text(roundedPct + '%'));
            }
            $track.append($fill);

            if (roundedPct < 15) {
                $track.append(
                    $('<span class="cbv-outside-label"></span>')
                        .text(roundedPct + '%')
                        .css({ left: 'calc(' + roundedPct + '% + 8px)' })
                );
            }

            $row.append($track);

            if (threshold && !colorMap[threshold]) {
                var fieldNote = thresholdIdx > -1 ? ('"' + fields[thresholdIdx] + '" ') : '';
                var knownValues = Object.keys(colorMap).join(', ') || 'none configured';
                $row.append(
                    $('<div class="cbv-hint"></div>').text(
                        'Threshold field ' + fieldNote + 'value "' + threshold +
                        '" not recognized (expected: ' + knownValues + ').'
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
