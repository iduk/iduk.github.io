// 라인그래프 샘플
$('#highchart-container').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        type: 'areaspline',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    credits: {
        enabled: false
    },
    title: false,
    xAxis: {
        categories: ['18.12.10\<br>08:00', '18.12.10\<br>09:00', '18.12.10\<br>10:00', '18.12.10\<br>11:00', '18.12.10\<br>12:00', '18.12.10\<br>13:00', '18.12.10\<br>14:00', '18.12.10\<br>15:00', '18.12.10\<br>16:00', '18.12.10\<br>17:00', '18.12.10\<br>18:00', '18.12.10\<br>19:00']
    },
    plotOptions: {
        series: {
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.getOptions().colors[0]],
                    [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                ]
            }
        }
    },
    series: [{ data: [24, 56, 96, 100, 120, 176, 144, 176, 276, 184, 110, 92,] }],
    legend: false
});
// 라인그래프 샘플 2
$('#highchart-container2').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        type: 'areaspline',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    credits: {
        enabled: false
    },
    title: false,
    xAxis: {
        categories: ['0']
    },
    plotOptions: {
        series: {
            borderWidth: 1,
            color: '#6F7AF3',
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.getOptions().colors[4]],
                    [1, Highcharts.Color(Highcharts.getOptions().colors[4]).setOpacity(0).get('rgba')]
                ]
            }
        }
    },
    series: [{ data: [24, 56, 96, 100, 120, 176, 144, 176, 276, 184, 110, 92,] }],
    legend: false
});

// 라인그래프 샘플 3
$('#highchart-container3').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        type: 'areaspline',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    credits: {
        enabled: false
    },
    title: false,
    xAxis: {
        categories: ['18.12.10\<br>08:00', '18.12.10\<br>09:00', '18.12.10\<br>10:00', '18.12.10\<br>11:00', '18.12.10\<br>12:00', '18.12.10\<br>13:00', '18.12.10\<br>14:00', '18.12.10\<br>15:00', '18.12.10\<br>16:00', '18.12.10\<br>17:00', '18.12.10\<br>18:00', '18.12.10\<br>19:00']
    },
    plotOptions: {
        series: {
            fillColor: {
                borderWidth: 2,
                color: '#00C8A1',
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.getOptions().colors[2]],
                    [1, Highcharts.Color(Highcharts.getOptions().colors[2]).setOpacity(0).get('rgba')]
                ]
            }
        }
    },
    series: [{ data: [24, 56, 96, 100, 120, 176, 144, 176, 276, 184, 110, 92,] }],
    legend: false
});

// 라인그래프 샘플 4
$('#highchart-container4').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        type: 'areaspline',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    credits: {
        enabled: false
    },
    title: false,
    xAxis: {
        categories: ['18.12.10\<br>08:00', '18.12.10\<br>09:00', '18.12.10\<br>10:00', '18.12.10\<br>11:00', '18.12.10\<br>12:00', '18.12.10\<br>13:00', '18.12.10\<br>14:00', '18.12.10\<br>15:00', '18.12.10\<br>16:00', '18.12.10\<br>17:00', '18.12.10\<br>18:00', '18.12.10\<br>19:00']
    },
    plotOptions: {
        series: {
            borderWidth: 2,
            color: '#FF9041',
            fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                    [0, Highcharts.getOptions().colors[3]],
                    [1, Highcharts.Color(Highcharts.getOptions().colors[3]).setOpacity(0).get('rgba')]
                ]
            }
        }
    },
    series: [{ data: [24, 56, 96, 100, 120, 176, 144, 176, 276, 184, 110, 92,] }],
    legend: false
});




// 막대그래프 샘플
$('#highchart-stack').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        zoomType: 'xy',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    title: false,
    subtitle: false,
    xAxis: [{
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value}',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        title: {
            text: '샘플타이틀(m3/hr)',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }, { // Secondary yAxis
        title: {
            text: '샘플타이틀2',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        labels: {
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        opposite: true
    }],
    tooltip: {
        shared: true,
        backgroundColor: '#fff',
        borderWidth: 0,
        borderRadius: 4
    },
    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        x: 0,
        y: 0,
        floating: false,
        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || 'rgba(255,255,255, 0.25)'
    },
    series: [{
        type: 'column',
        yAxis: 1,
        data: [49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4],
        color: 'rgba(73, 140, 255, 0.9)',
        borderRadius: 2,
        maxPointWidth: 16,
        tooltip: {
            valueSuffix: ' mm'
        },
    }, {
        type: 'line',
        data: [7.0, 6.9, 9.5, 14.5, 32, 36, 24, 31, 43.3, 18.3, 13.9, 9.6],
        dashStyle: 'Dash',
        borderWidth: 1,
        color: '#00C8A1',
        tooltip: {
            valueSuffix: '°C'
        }
    }],
    credits: {
        text: '',
        href: '',
        enabled: false
    }
});



// 막대그래프 샘플2
$('#highchart-stack-weight').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        zoomType: 'xy',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    title: false,
    subtitle: false,
    xAxis: [{
        categories: ['2016. 12', '2017. 12', '2018. 12', '진단일'],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value}',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        title: {
            text: '샘플타이틀(m3/hr)',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }, { // Secondary yAxis
        labels: {
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        opposite: true
    }],
    tooltip: {
        shared: true,
        backgroundColor: '#fff',
        borderWidth: 0,
        borderRadius: 4
    },
    legend: {
        enabled : false
    },
    series: [{
        type: 'column',
        yAxis: 1,
        data: [50, 75, 100, 120],
        color: 'rgba(73, 140, 255, 0.9)',
        borderRadius: 2,
        maxPointWidth: 50,
        tooltip: {
            valueSuffix: ' mm'
        }
    }],
    credits: {
        text: '',
        href: '',
        enabled: false
    }
});



// 막대그래프 샘플 (2 라인)
$('#highchart-stack-line').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        zoomType: 'xy',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    title: false,
    subtitle: false,
    xAxis: [{
        categories: ['2015', '2016', '2017', '2018'],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value} %',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        title: {
            text: '유수율(%)',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }, { // Secondary yAxis
        title: {
            text: '유량(m3)',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        labels: {
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        opposite: true
    }],
    tooltip: {
        shared: true,
        backgroundColor: '#fff',
        borderWidth: 0,
        borderRadius: 4
    },
    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        x: 0,
        y: 0,
        floating: false,
        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || 'rgba(255,255,255, 0.25)'
    },
    series: [{
        name: '유수율',
        type: 'column',
        yAxis: 1,
        data: [8500, 8600, 8400, 8792],
        color: 'rgba(73, 140, 255, 0.9)',
        borderRadius: 2,
        maxPointWidth: 8,
        tooltip: {
            valueSuffix: ' mm'
        },
    }, {
        name: '총 급수량',
        type: 'line',
        data: [6800, 6920, 6830, 6900],

        dashStyle: 'Solid',
        borderWidth: 1,
        color: '#79828b',
        tooltip: {
            valueSuffix: '°C'
        },
        marker: {
            enabled: true,
            symbol: 'circle'
        },
    }, {
        name: '유수수량',
        type: 'line',
        data: [7200, 7120, 7200, 7180],
        dashStyle: '',
        borderWidth: 1,
        color: '#00C8A1',
        tooltip: {
            valueSuffix: '°C'
        },
        marker: {
            enabled: true,
            symbol: 'circle'
        },
    }],
    credits: {
        text: '',
        href: '',
        enabled: false
    }
});



// 막대그래프 샘플 (2 라인)
$('#highchart-stack-line2').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        zoomType: 'xy',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    title: false,
    subtitle: false,
    xAxis: [{
        categories: ['2007', '2008', '2009', '2010', '2011', '2012',
            '2013', '2014', '2015', '2016', '2017', '2018'],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value} %',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        title: {
            text: '유수율(%)',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }, { // Secondary yAxis
        title: {
            text: '유량(m3)',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        labels: {
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        opposite: true
    }],
    tooltip: {
        shared: true,
        backgroundColor: '#fff',
        borderWidth: 0,
        borderRadius: 4
    },
    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        x: 0,
        y: 0,
        floating: false,
        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || 'rgba(255,255,255, 0.25)'
    },
    series: [{
        name: '유수율',
        type: 'column',
        yAxis: 1,
        data: [8500, 8600, 9564, 9792, 9440, 8760, 9356, 8485, 9164, 9941, 9560, 9544],
        color: 'rgba(73, 140, 255, 0.9)',
        borderRadius: 2,
        maxPointWidth: 8,
        tooltip: {
            valueSuffix: ' mm'
        },
    }, {
        name: '총 급수량',
        type: 'line',
        data: [7000, 6000, 9000, 8400, 8200, 7600, 8024, 7100, 7300, 8180, 8300, 7100],

        dashStyle: 'Solid',
        borderWidth: 1,
        color: '#79828b',
        tooltip: {
            valueSuffix: '°C'
        },
        marker: {
            enabled: true,
            symbol: 'circle'
        },
    }, {
        name: '유수수량',
        type: 'line',
        data: [5000, 4000, 7000, 6400, 6200, 5600, 6024, 5000, 5300, 6180, 6300, 5100],
        dashStyle: '',
        borderWidth: 1,
        color: '#00C8A1',
        tooltip: {
            valueSuffix: '°C'
        },
        marker: {
            enabled: true,
            symbol: 'circle'
        },
    }],
    credits: {
        text: '',
        href: '',
        enabled: false
    }
});



// 라인그래프 샘플
$('#highchart-areaspline').highcharts({
    chart: {
        type: 'areaspline'
    },
    title: {
        text: ''
    },
    legend: {
        enabled: false
    },
    xAxis: {
        allowDecimals: false,
        plotBands: [{
            color: '#FAFBFC',
            from: 3,
            to: 3.5
        }]
    },
    yAxis: {
        title: false
    },
    tooltip: {
        shared: true,
        valueSuffix: ' units'
    },
    credits: {
        enabled: false
    },
    plotOptions: {
        areaspline: {
            fillOpacity: 0.5,
        }
    },
    series: [{
        type: 'spline',
        name: 'sample0',
        lineColor: 'rgba(73, 140, 255, 0.9)',
        fillColor: false,
        borderWidth: 4,
        data: [32, 34, 33, 35, 33, 31, 32,32, 34, 33, 35, 33, 31, 32]
    }, {
        type: 'spline',
        name: 'sample1',
        lineColor: 'rgba(0, 200, 161, 0.9)',
        fillColor: false,
        data: [22, 24, 23, 25, 23, 21, 22,22, 24, 23, 25, 23, 21, 22]
    }, {
        type: 'spline',
        name: 'sample2',
        lineColor: 'rgba(255, 144, 65, 0.9)',
        fillColor: false,
        data: [12, 14, 13, 15, 13, 11, 12,12, 14, 13, 15, 13, 11, 12]
    }, {
        type: 'spline',
        name: 'sample3',
        lineColor: 'rgba(248, 99, 114, 0.9)',
        fillColor: false,
        data: [3, 2, 7, 5, 6, 7, 6, 3, 6, 7, 5, 6, 8, 6]
    }]
});




// 막대그래프 샘플 (2 라인)
$('#highchart-daily').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        type: 'line',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    title: false,
    subtitle: false,
    xAxis: [{
        categories: ['2007', '2008', '2009', '2010', '2011', '2012',
            '2013', '2014', '2015', '2016', '2017', '2018'],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value} %',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        title: {
            text: '유수율(%)',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }],
    tooltip: {
        shared: true,
        backgroundColor: '#fff',
        borderWidth: 0,
        borderRadius: 4
    },
    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        x: 0,
        y: 0,
        floating: false,
        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || 'rgba(255,255,255, 0.25)'
    },
    series: [{
        name: '유수율',
        type: 'line',
        XAxis: 1,
        data: [85, 86, 95, 92, 90, 87, 96, 84, 91, 91, 90, 94],
        color: 'rgba(73, 140, 255, 0.9)',
        borderRadius: 2,
        maxPointWidth: 8,
        tooltip: {
            valueSuffix: ' mm'
        },
    }, {
        name: '총 급수량',
        type: 'line',
        data: [83, 82, 90, 80, 88, 83, 84, 79, 86, 87, 86, 90],

        dashStyle: 'Solid',
        borderWidth: 1,
        color: '#79828b',
        tooltip: {
            valueSuffix: '°C'
        },
        marker: {
            enabled: true,
            symbol: 'circle'
        },
    }],
    credits: {
        text: '',
        href: '',
        enabled: false
    }
});


// 원형 차트 샘플
$('#highchart-circle').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
    },
    title: false,
    subtitle: false,
    tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
        pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                style: {
                    color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                }
            }
        }
    },
    series: [{
        name: '총량수량수지',
        colorByPoint: true,
        data: [{
            name: '계량 요금수량',
            y: 61.41,
            sliced: true,
            selected: true
        }, {
            name: '누수량',
            y: 11.84
        }, {
            name: '조정감액수량',
            y: 10.85
        }, {
            name: '계량기 불감수량',
            y: 4.67
        }, {
            name: '공공수량',
            y: 4.18
        }, {
            name: '수도사업 용수량',
            y: 1.64
        }]
    }],

    credits: {
        text: '',
        href: '',
        enabled: false
    }
});






// 점박이 차트 샘플
$('#highchart-scatter').highcharts({
    chart: {
        renderTo: '.chart-wrapper',
        type: 'scatter',
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    title: false,
    subtitle: false,
    xAxis: [{
        categories: ['0'],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value} %',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        title: {
            text: 'sample',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }],
    tooltip: {
        shared: true,
        backgroundColor: '#fff',
        borderWidth: 0,
        borderRadius: 4
    },
    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        x: 0,
        y: 0,
        floating: false,
        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || 'rgba(255,255,255, 0.25)'
    },
    series: [{
        name: 'Title',
        type: 'scatter',
        XAxis: 1,
        data: [85, 86, 89, 92, 90, 89, 91, 93, 92, 94],
        color: 'rgba(73, 140, 255, 0.9)',
        borderRadius: 2,
        maxPointWidth: 8,
        tooltip: {
            valueSuffix: ' mm'
        },
    }],
    credits: {
        text: '',
        href: '',
        enabled: false
    }
});





// area range
$('#highchart-arearange').highcharts({
    chart: {
        type: 'arearange',
        zoomType: 'x',
        scrollablePlotArea: {
            minWidth: 600,
            scrollPositionX: 1
        },
        style: {
            fontFamily: 'Play, Noto Sans KR, sans-serif'
        }
    },
    rangeSelector : {
        selected : 1
    },
    title: false,
    subtitle: false,
    xAxis: {
        type: 'datetime'
    },
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value} %',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        title: {
            text: 'sample',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        }
    }],
    tooltip: {
        shared: true,
        backgroundColor: '#fff',
        borderWidth: 0,
        borderRadius: 4
    },
    legend: {
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
        x: 0,
        y: 0,
        floating: false,
        backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || 'rgba(255,255,255, 0.25)'
    },
    series: [{
        name: 'Title',
        type: 'area',
        XAxis: 1,
        data: '[85, 86, 89, 92]',
        color: 'rgba(73, 140, 255, 0.9)',
        borderRadius: 2,
        maxPointWidth: 8,
        tooltip: {
            valueSuffix: ' mm'
        },
    }],
    credits: {
        enabled: false
    },
    data: {}
});



//
$('#highchart-rainbow').highcharts({

    title: {
        text: ''
    },

    xAxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May']
    },

    series: [{
        type: 'column',
        colorByPoint: true,
        data: [34, 45, 56, 64, 98, 124, 96, 54, 43],
        showInLegend: false
    }]

});



