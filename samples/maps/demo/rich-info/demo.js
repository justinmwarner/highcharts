
$.ajax({
    url: 'https://cdn.rawgit.com/highcharts/highcharts/057b672172ccc6c08fe7dbb27fc17ebca3f5b770/samples/data/world-population-history.csv',
    success: function (csv) {

        // Parse the CSV Data
        /*Highcharts.data({
            csv: data,
            switchRowsAndColumns: true,
            parsed: function () {
                console.log(this.columns);
            }
        });*/

        // Very simple and case-specific CSV string splitting
        function CSVtoArray(text) {
            return text.replace(/^"/, '')
                .replace(/",$/, '')
                .split('","');
        }

        csv = csv.split(/\n/);

        var countries = {},
            mapChart,
            countryChart,
            numRegex = /^[0-9\.]+$/,
            lastCommaRegex = /,\s$/,
            quoteRegex = /\"/g,
            categories = CSVtoArray(csv[2]).slice(4);

        // Parse the CSV into arrays, one array each country
        $.each(csv.slice(3), function (j, line) {
            var row = CSVtoArray(line),
                data = row.slice(4);

            $.each(data, function (i, val) {
                val = val.replace(quoteRegex, '');
                if (numRegex.test(val)) {
                    val = parseInt(val, 10);
                } else if (!val || lastCommaRegex.test(val)) {
                    val = null;
                }
                data[i] = val;
            });

            countries[row[1]] = {
                name: row[0],
                code3: row[1],
                data: data
            };
        });

        // For each country, use the latest value for current population
        var data = [];
        for (var code3 in countries) {
            if (countries.hasOwnProperty(code3)) {
                var value = null,
                    year,
                    itemData = countries[code3].data,
                    i = itemData.length;

                while (i--) {
                    if (typeof itemData[i] === 'number') {
                        value = itemData[i];
                        year = categories[i];
                        break;
                    }
                }
                data.push({
                    name: countries[code3].name,
                    code3: code3,
                    value: value,
                    year: year
                });
            }
        }

        // Add lower case codes to the data set for inclusion in the tooltip.pointFormat
        var mapData = Highcharts.geojson(Highcharts.maps['custom/world']);
        $.each(mapData, function () {
            this.id = this.properties['hc-key']; // for Chart.get()
            this.flag = this.id.replace('UK', 'GB').toLowerCase();
        });

        // Wrap point.select to get to the total selected points
        Highcharts.wrap(Highcharts.Point.prototype, 'select', function (proceed) {

            proceed.apply(this, Array.prototype.slice.call(arguments, 1));

            var points = mapChart.getSelectedPoints();
            if (points.length) {
                if (points.length === 1) {
                    $('#info #flag').attr('class', 'flag ' + points[0].flag);
                    $('#info h2').html(points[0].name);
                } else {
                    $('#info #flag').attr('class', 'flag');
                    $('#info h2').html('Comparing countries');

                }
                $('#info .subheader').html('<h4>Historical population</h4><small><em>Shift + Click on map to compare countries</em></small>');

                if (!countryChart) {
                    countryChart = Highcharts.chart('country-chart', {
                        chart: {
                            height: 250,
                            spacingLeft: 0
                        },
                        credits: {
                            enabled: false
                        },
                        title: {
                            text: null
                        },
                        subtitle: {
                            text: null
                        },
                        xAxis: {
                            tickPixelInterval: 50,
                            crosshair: true
                        },
                        yAxis: {
                            title: null,
                            opposite: true
                        },
                        tooltip: {
                            split: true
                        },
                        plotOptions: {
                            series: {
                                animation: {
                                    duration: 500
                                },
                                marker: {
                                    enabled: false
                                },
                                threshold: 0,
                                pointStart: parseInt(categories[0], 10)
                            }
                        }
                    });
                }

                countryChart.series.slice(0).forEach(function (s) {
                    s.remove(false);
                });
                points.forEach(function (p) {
                    countryChart.addSeries({
                        name: p.name,
                        data: countries[p.code3].data,
                        type: points.length > 1 ? 'line' : 'area'
                    }, false);
                });
                countryChart.redraw();

            } else {
                $('#info #flag').attr('class', '');
                $('#info h2').html('');
                $('#info .subheader').html('');
                if (countryChart) {
                    countryChart = countryChart.destroy();
                }
            }
        });

        // Initiate the map chart
        mapChart = Highcharts.mapChart('container', {

            title: {
                text: 'Population history by country'
            },

            subtitle: {
                text: 'Source: <a href="http://data.worldbank.org/indicator/SP.POP.TOTL/countries/1W?display=default">The World Bank</a>'
            },

            mapNavigation: {
                enabled: true,
                buttonOptions: {
                    verticalAlign: 'bottom'
                }
            },

            colorAxis: {
                type: 'logarithmic',
                endOnTick: false,
                startOnTick: false,
                min: 50000
            },

            tooltip: {
                footerFormat: '<span style="font-size: 10px">(Click for details)</span>'
            },

            series: [{
                data: data,
                mapData: mapData,
                joinBy: ['iso-a3', 'code3'],
                name: 'Current population',
                allowPointSelect: true,
                cursor: 'pointer',
                states: {
                    select: {
                        color: '#a4edba',
                        borderColor: 'black',
                        dashStyle: 'shortdot'
                    }
                }
            }]
        });

        // Pre-select a country
        mapChart.get('us').select();
    }
});
