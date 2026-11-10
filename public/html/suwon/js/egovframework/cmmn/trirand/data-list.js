$(document).ready(function () {
	var data_graph = new Object();
	var data_graph2 = new Object();
	loadJQGrid();
})

function loadJQGrid() {

	var listmap = new Array();
	var map = new Object();
	var map2 = new Object();

	map.data1 = "2018-01-01";
	map.data2 = "2.985";
	map.data3 = "0.027";
	map.data4 = "99.9";
	listmap.push(map); //위의 정보를 Row에 삽입
	map.datatime1 = "오전 12:00";
	map.datatime2 = "32";
	map.datatime3 = "3.5";
	listmap.push(map); //위의 정보를 Row에 삽입
	map.dataminute1 = "12";
	map.dataminute2 = "asdkljasd";
	map.dataminute3 = "03843";
	listmap.push(map); //위의 정보를 Row에 삽입


	var waterMap = new Array();
	var map = new Object();
	var map2 = new Object();

	map.wtEnergy1 = "2014-02-24 00:00";
	map.wtEnergy2 = "2.47";
	map.wtEnergy3 = "0.027";
	map.wtEnergy4 = "0.358";
	map.wtEnergy5 = "0.358";
	map.wtEnergy6 = "0.358";
	map.wtEnergy7 = "0.358";
	map.wtEnergy8 = "0.358";
	map.wtEnergy9 = "0.358";
	map.wtEnergy10 = "0.358";
	map.wtEnergy11 = "0.358";
	map.wtEnergy12 = "0.358";
	map.wtEnergy13 = "0.358";
	map.wtEnergy14 = "0.358";
	map.wtEnergy15 = "0.358";
	map.wtEnergy16 = "0.358";
	map.wtEnergy17 = "0.358";
	map.wtEnergy18 = "0.358";
	map.wtEnergy19 = "0.358";
	map.wtEnergy20 = "0.358";
	map.wtEnergy21 = "0.358";
	map.wtEnergy22 = "0.358";
	waterMap.push(map);

	map.dataTotal1 = "유량(L/min)";
	map.dataTotal2 = "평균";
	map.dataTotal3 = "0.027";
	map.dataTotal4 = "2.016";
	waterMap.push(map);


	//  # Location  데이터조회 > 유량/수압 일별조회 (관망관리 화면설계v3 - p.13)
	//  # Caption   일 데이터
	$("#data-day").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataDay,
		colNames: ['측정일', '적산유량(㎥/d)', '평균수압(kgf/㎠)', '유효데이타\<br/>확보율(%)'],
		colModel: [{
				label: 'dataday1',
				name: 'dataday1',
				width: 130,
				align: 'center'
			},
			{
				label: 'dataday2',
				name: 'dataday2',
				width: 120,
				align: 'center'
			},
			{
				label: 'dataday3',
				name: 'dataday3',
				width: 130,
				align: 'center'
			},
			{
				label: 'dataday4',
				name: 'dataday4',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
	});
	var dataDay = [{
			dataday1: '2018.10.24',
			dataday2: '2.987',
			dataday3: '3.856',
			dataday4: '100'
		},
		{
			dataday1: '2018.10.24',
			dataday2: '2.987',
			dataday3: '3.856',
			dataday4: '100'
		},
		{
			dataday1: '2018.10.24',
			dataday2: '2.987',
			dataday3: '3.856',
			dataday4: '100'
		},
		{
			dataday1: '2018.10.24',
			dataday2: '2.987',
			dataday3: '3.856',
			dataday4: '100'
		}
	];
	for (i = 0; i <= dataDay.length; i++)
		$("#data-day").jqGrid('addRowData', i + 1, dataDay[i]);
	//



	//  # Location  데이터조회 > 유량/수압 일별조회 (관망관리 화면설계v3 - p.13)
	//  # Caption   시간 데이터
	$("#data-time").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: listmap,
		colNames: ['시간', '적산유량(㎥/h)', '평균수압(kgf/㎠)'],
		colModel: [{
				label: 'datatime1',
				name: 'datatime1',
				width: 180,
				align: 'center',
				key: true
			},
			{
				label: 'datatime2',
				name: 'datatime2',
				width: 150,
				align: 'center'
			},
			{
				label: 'datatime3',
				name: 'datatime3',
				width: 150,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
	});



	//  # Location  데이터조회 > 유량/수압 일별조회 (관망관리 화면설계v3 - p.13)
	//  # Caption   분데이터
	$("#data-minute").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: listmap,
		colNames: ['분', '순시유량(L/min)', '평균수압(kgf/cm2)'],
		colModel: [{
				label: 'dataminute1',
				name: 'dataminute1',
				width: 100,
				align: 'center',
				key: true
			},
			{
				label: 'dataminute2',
				name: 'dataminute2',
				width: 100,
				align: 'center'
			},
			{
				label: 'dataminute3',
				name: 'dataminute3',
				width: 100,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
	});



	//  # Location  데이터조회 > 유량/수압조회 (관망관리 화면설계v3 - p.12)
	//  # Caption   유량 및 수압 데이터
	$("#data-fpvData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: waterMap,
		colNames: ['측정일', '적산유량(㎥/d)', '평균수압(kgf/㎠)', '유량', '수압', '유량', '수압', '유량', '수압'],
		colModel: [{
				label: 'wtEnergy1',
				name: 'wtEnergy1',
				width: 150,
				align: 'center'
			},
			{
				label: 'wtEnergy2',
				name: 'wtEnergy2',
				width: 120,
				align: 'center'
			},
			{
				label: 'wtEnergy3',
				name: 'wtEnergy3',
				width: 120,
				align: 'center'
			},
			{
				label: 'wtEnergy4',
				name: 'wtEnergy4',
				width: 92,
				align: 'center'
			},
			{
				label: 'wtEnergy5',
				name: 'wtEnergy5',
				width: 92,
				align: 'center'
			},
			{
				label: 'wtEnergy6',
				name: 'wtEnergy6',
				width: 92,
				align: 'center'
			},
			{
				label: 'wtEnergy7',
				name: 'wtEnergy7',
				width: 92,
				align: 'center'
			},
			{
				label: 'wtEnergy8',
				name: 'wtEnergy8',
				width: 92,
				align: 'center'
			},
			{
				label: 'wtEnergy9',
				name: 'wtEnergy9',
				width: 92,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit:false, // 가로 스크롤바
		forceFit: true
	});
	$("#data-fpvData").jqGrid('setGroupHeaders', { //Header 그룹핑
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'wtEnergy4',
				numberOfColumns: 2,
				titleText: '판정성필터링'
			},
			{
				startColumnName: 'wtEnergy6',
				numberOfColumns: 2,
				titleText: '확정성필터링'
			},
			{
				startColumnName: 'wtEnergy8',
				numberOfColumns: 2,
				titleText: '최종 필터링'
			}
		]
	});
	//




	//  # Location  데이터조회 > 유량/수압조회 (관망관리 화면설계v3 - p.12)
	//  # Caption   데이터 통계 정보
	$("#data-total").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataTotal,
		colNames: ['구분', '-', '유효데이터(유효)', '무효데이터(유효+무효)'],
		colModel: [{
				name: 'data1',
				index: 'data1',
				width: 100,
				align: 'left',
				key: true
			},
			{
				name: 'data2',
				index: 'data2',
				width: 60,
				align: 'center'
			},
			{
				name: 'data3',
				index: 'data3',
				width: 120,
				align: 'right'
			},
			{
				name: 'data4',
				index: 'data4',
				width: 120,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	var dataTotal = [{
			data1: '유량(L/min)',
			data2: '평균',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최대',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최소',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '수압(kgf/cm2)',
			data2: '평균',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최대',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최소',
			data3: '3.856',
			data4: '3.856'
		}
	];
	for (i = 0; i <= dataTotal.length; i++)
		$("#data-total").jqGrid('addRowData', i + 1, dataTotal[i]);
	//




	//  # Location  데이터조회 > 유량/수압조회 (관망관리 화면설계v3 - p.12)
	//  # Caption   약
	$("#data-summary").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataSumm,
		colNames: ['구분', '유량', '수압'],
		colModel: [{
				name: 'data1',
				index: 'data1',
				width: 80,
				align: 'center',
				key: true
			},
			{
				name: 'data2',
				index: 'data2',
				width: 50,
				align: 'right'
			},
			{
				name: 'data3',
				index: 'data3',
				width: 50,
				align: 'right'
			}
		],
		viewrecords: true,
		autowidth: true,
		width: 'auto',
		//shrinkToFit:false // 가로 스크롤바
		//multiselect: true // 체크박스 발견(!)
	});
	var dataSumm = [{
			data1: '전체 레코드 수',
			data2: '123490',
			data3: '908213'
		},
		{
			data1: '유효 레코드 수',
			data2: '458990',
			data3: '124'
		},
		{
			data1: '무효 레코드 수',
			data2: '764',
			data3: '1233'
		},
		{
			data1: '결측 레코드 수',
			data2: '12',
			data3: '9'
		}
	];
	for (i = 0; i <= dataSumm.length; i++)
		$("#data-summary").jqGrid('addRowData', i + 1, dataSumm[i]);
	//



	//  # Location  데이터조회 > 수질조회 (관망관리 화면설계v3 - p.14)
	//  # Caption   수질 데이터
	$("#data-water-energy").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: waterMap,
		colNames: ['측정일', '탁도(NTU)', 'pH', '잔류염소(mg/L)', '전기전도도(μS/cm)', '수온(℃)', '상태정보', '탁도(NTU)', 'pH', '잔류염소(mg/L)', '전기전도도(us/cm)', '수온(‘C)', '탁도(NTU)', 'pH', '잔류염소(mg/L)', '전기전도도(us/cm)', '수온(‘C)', '탁도(NTU)', 'pH', '잔류염소(mg/L)', '전기전도도(us/cm)', '수온(‘C)'],
		colModel: [{
				label: 'wtEnergy1',
				name: 'wtEnergy1',
				width: 150,
				align: 'center',
				key: true
			},
			{
				label: 'wtEnergy2',
				name: 'wtEnergy2',
				width: 120,
				align: 'center'
			},
			{
				label: 'wtEnergy3',
				name: 'wtEnergy3',
				width: 120,
				align: 'center'
			},
			{
				label: 'wtEnergy4',
				name: 'wtEnergy4',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy5',
				name: 'wtEnergy5',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy6',
				name: 'wtEnergy6',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy7',
				name: 'wtEnergy7',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy8',
				name: 'wtEnergy8',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy9',
				name: 'wtEnergy9',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy10',
				name: 'wtEnergy10',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy11',
				name: 'wtEnergy11',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy12',
				name: 'wtEnergy12',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy13',
				name: 'wtEnergy13',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy14',
				name: 'wtEnergy14',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy15',
				name: 'wtEnergy15',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy16',
				name: 'wtEnergy16',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy17',
				name: 'wtEnergy17',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy18',
				name: 'wtEnergy18',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy19',
				name: 'wtEnergy19',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy20',
				name: 'wtEnergy20',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy21',
				name: 'wtEnergy21',
				width: 127,
				align: 'center'
			},
			{
				label: 'wtEnergy22',
				name: 'wtEnergy22',
				width: 127,
				align: 'center'
			}
		],
		viewrecords: true,
		width: '1800',
		height: '900',
		autowidth: true,
		shrinkToFit: false, // 가로 스크롤바
		forceFit: true
	});
	$("#data-water-energy").jqGrid('setGroupHeaders', { //Header 그룹핑
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'wtEnergy8',
				numberOfColumns: 5,
				titleText: '최종'
			},
			{
				startColumnName: 'wtEnergy13',
				numberOfColumns: 5,
				titleText: '판정성'
			},
			{
				startColumnName: 'wtEnergy18',
				numberOfColumns: 5,
				titleText: '확정성'
			}
		]
	});
	//




	//  # Location  데이터조회 > 수질조회 (관망관리 화면설계v3 - p.14)
	//  # Caption   데이터 통계
	$("#water-data-total").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: waterData,
		colNames: ['구분', '-', '유효데이터(유효)', '무효데이터(유효+무효)'],
		colModel: [{
				name: 'data1',
				index: 'data1',
				width: 100,
				align: 'left',
				key: true
			},
			{
				name: 'data2',
				index: 'data2',
				width: 60,
				align: 'center'
			},
			{
				name: 'data3',
				index: 'data3',
				width: 120,
				align: 'right'
			},
			{
				name: 'data4',
				index: 'data4',
				width: 120,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
	});
	var waterData = [{
			data1: '탁도',
			data2: '평균',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최대',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최소',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: 'pH',
			data2: '평균',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최대',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '',
			data2: '최소',
			data3: '3.856',
			data4: '3.856'
		},
		{
			data1: '잔류염소',
			data2: '평균',
			data3: '0.07',
			data4: '0.07'
		},
		{
			data1: '',
			data2: '최대',
			data3: '0.07',
			data4: '0.07'
		},
		{
			data1: '',
			data2: '최소',
			data3: '0.07',
			data4: '0.07'
		},
		{
			data1: '전기전도도',
			data2: '평균',
			data3: '983.4',
			data4: '983.4'
		},
		{
			data1: '',
			data2: '최대',
			data3: '983.4',
			data4: '983.4'
		},
		{
			data1: '',
			data2: '최소',
			data3: '983.4',
			data4: '983.4'
		},
		{
			data1: '수온',
			data2: '평균',
			data3: '16.7',
			data4: '16.7'
		},
		{
			data1: '',
			data2: '최대',
			data3: '16.7',
			data4: '16.7'
		},
		{
			data1: '',
			data2: '최소',
			data3: '16.7',
			data4: '16.7'
		}
	];
	for (i = 0; i <= waterData.length; i++)
		$("#water-data-total").jqGrid('addRowData', i + 1, waterData[i]);
	//




	//  # Location  데이터조회 > 수질조회 (관망관리 화면설계v3 - p.14)
	//  # Caption   데이터 요약
	$("#water-data-summary").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: waterSumm,
		colNames: ['구분', '탁도', 'pH', '잔류염소', '전기전도도', '수온'],
		colModel: [{
				name: 'data1',
				index: 'data1',
				width: 90,
				align: 'center'
			},
			{
				name: 'data2',
				index: 'data2',
				width: 40,
				align: 'right'
			},
			{
				name: 'data3',
				index: 'data3',
				width: 40,
				align: 'right'
			},
			{
				name: 'data4',
				index: 'data4',
				width: 50,
				align: 'right'
			},
			{
				name: 'data5',
				index: 'data4',
				width: 60,
				align: 'right'
			},
			{
				name: 'data6',
				index: 'data4',
				width: 50,
				align: 'right'
			}
		],
		viewrecords: true,
		autowidth: true,
		height: '100',
		shrinkToFit: false // 가로 스크롤바
		//multiselect: true // 체크박스 발견(!)
	});
	var waterSumm = [{
			data1: '전체 레코드 수',
			data2: '1234',
			data3: '00',
			data4: '0.972',
			data5: '0.972',
			data6: '0.972',
		},
		{
			data1: '유효 레코드 수',
			data2: '0',
			data3: '124',
			data4: '0.972',
			data5: '0.972',
			data6: '0.972',
		},
		{
			data1: '무효 레코드 수',
			data2: '000',
			data3: '1233',
			data4: '0.972',
			data5: '0.972',
			data6: '0.972',
		},
		{
			data1: '결측 레코드 수',
			data2: '12',
			data3: '9',
			data4: '0.972',
			data5: '0.972',
			data6: '0.972',
		}
	];
	for (i = 0; i <= waterSumm.length; i++)
		$("#water-data-summary").jqGrid('addRowData', i + 1, waterSumm[i]);
	//




	//  # Location  데이터조회 > 수질조회 > 수질기준설정 팝업 (관망관리 화면설계v3 - p.15)
	//  # Caption   수질기준설정
	$("#water-standard").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: waterSt,
		colNames: ['구분', '정상 범위'],
		colModel: [{
				name: 'data1',
				index: 'data1',
				width: 80,
				align: 'center',
				sorttype: 'int'
			},
			{
				name: 'data2',
				index: 'data2',
				width: 150,
				align: 'center'
			}
		],
		viewrecords: true,
		autowidth: true,
		width: 'auto',
		//multiselect: true // 체크박스 발견(!)
	});
	var waterSt = [{
			data1: '전체 레코드 수',
			data2: '123490'
		},
		{
			data1: '유효 레코드 수',
			data2: '458990'
		}
	];
	for (i = 0; i <= waterSt.length; i++)
		$("#water-standard").jqGrid('addRowData', i + 1, waterSt[i]);
	//





	//  # Location  데이터조회 > 요금부과량조회 (관망관리 화면설계v3 - p.16)
	//  # Caption   월별 요금부과량
	$("#data-bill-month").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: billMonth,
		colNames: ['일시', '수용가수', '세대수', '원본', '기간보정'],
		colModel: [{
				name: 'billMonth1',
				index: 'billMonth1',
				width: 120,
				align: 'center'
			},
			{
				name: 'billMonth2',
				index: 'billMonth2',
				width: 140,
				align: 'center'
			},
			{
				name: 'billMonth3',
				index: 'billMonth3',
				width: 140,
				align: 'center'
			},
			{
				name: 'billMonth4',
				index: 'billMonth4',
				width: 140,
				align: 'center'
			},
			{
				name: 'billMonth5',
				index: 'billMonth5',
				width: 140,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#data-bill-month").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'billMonth4',
			numberOfColumns: 2,
			titleText: '최종'
		}]
	});
	// td 데이터
	var billMonth = [{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		},
		{
			billMonth1: '2017.09.02',
			billMonth2: '123490',
			billMonth3: '123490',
			billMonth4: '123490',
			billMonth5: '123490'
		}
	];
	for (i = 0; i <= billMonth.length; i++)
		$("#data-bill-month").jqGrid('addRowData', i + 1, billMonth[i]);
	//




	//  # Caption   수용가별 요금부과량
	$("#data-bill-custom").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: billCustom,
		colNames: ['수용가번호', '주소', '세대수', '업종', '구경(mm)', '검침일자', '원본', '기간보정'],
		colModel: [{
				name: 'billCustom1',
				index: 'billCustom1',
				width: 130,
				align: 'left'
			},
			{
				name: 'billCustom2',
				index: 'billCustom2',
				width: 200,
				align: 'left'
			},
			{
				name: 'billCustom3',
				index: 'billCustom3',
				width: 80,
				align: 'center'
			},
			{
				name: 'billCustom4',
				index: 'billCustom4',
				width: 120,
				align: 'center'
			},
			{
				name: 'billCustom5',
				index: 'billCustom5',
				width: 120,
				align: 'center'
			},
			{
				name: 'billCustom6',
				index: 'billCustom6',
				width: 120,
				align: 'center'
			},
			{
				name: 'billCustom7',
				index: 'billCustom7',
				width: 120,
				align: 'center'
			},
			{
				name: 'billCustom8',
				index: 'billCustom8',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#data-bill-custom").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'billCustom7',
			numberOfColumns: 2,
			titleText: '요금부과량(m3/월)'
		}]
	});
	// td 데이터
	var billCustom = [{
		billCustom1: '1234567891230',
		billCustom2: '경기도 수원시 권선구',
		billCustom3: '123490',
		billCustom4: '123490',
		billCustom5: '123490'
	}];
	for (i = 0; i <= billCustom.length; i++)
		$("#data-bill-custom").jqGrid('addRowData', i + 1, billCustom[i]);
	//




	//  # Caption   [모달] 옥내 누수징후 분석
	$("#leakCustomer").on('shown.bs.modal', function (event) {

		setTimeout(function () {
			$.jgrid.gridUnload('#data-leakCustomer'); //Grid 클리어
			$("#data-leakCustomer").jqGrid({
				styleUI: 'Bootstrap4',
				datatype: 'local',
				data: leakCustom,
				colNames: ['순번', '수용가번호', '주소', '세대수', '업종', '구경(mm)', '최근 3개월 평균', '당월', '증가율(%)'],
				colModel: [{
						name: 'leakCustomer1',
						index: 'leakCustomer1',
						width: 50,
						align: 'center'
					},
					{
						name: 'leakCustomer2',
						index: 'leakCustomer2',
						width: 130,
						align: 'left'
					},
					{
						name: 'leakCustomer3',
						index: 'leakCustomer3',
						width: 160,
						align: 'left'
					},
					{
						name: 'leakCustomer4',
						index: 'leakCustomer4',
						width: 60,
						align: 'center'
					},
					{
						name: 'leakCustomer5',
						index: 'leakCustomer5',
						width: 70,
						align: 'center'
					},
					{
						name: 'leakCustomer6',
						index: 'leakCustomer6',
						width: 80,
						align: 'center'
					},
					{
						name: 'leakCustomer7',
						index: 'leakCustomer7',
						width: 110,
						align: 'center'
					},
					{
						name: 'leakCustomer8',
						index: 'leakCustomer8',
						width: 60,
						align: 'center'
					},
					{
						name: 'leakCustomer9',
						index: 'leakCustomer9',
						width: 90,
						align: 'center'
					}
				],
				viewrecords: true,
				width: '600',
				autowidth: true
				//shrinkToFit: false // 가로 스크롤바
			});
			// Header 그룹핑
			$("#data-leakCustomer").jqGrid('setGroupHeaders', {
				useColSpanStyle: true,
				groupHeaders: [{
					startColumnName: 'leakCustomer7',
					numberOfColumns: 3,
					titleText: '요금부과량(m3/월)'
				}]
			});

			var leakCustom = [{
					leakCustomer1: '99',
					leakCustomer2: '1234567890123',
					leakCustomer3: '경기도 수원시 권선구',
					leakCustomer4: '9999',
					leakCustomer5: '가정용',
					leakCustomer6: '87',
					leakCustomer7: '9.9',
					leakCustomer8: '12',
					leakCustomer9: '200%'
				},
				{
					leakCustomer1: '99',
					leakCustomer2: '1234567890123',
					leakCustomer3: '경기도 수원시 권선구',
					leakCustomer4: '9999',
					leakCustomer5: '가정용',
					leakCustomer6: '87',
					leakCustomer7: '9.9',
					leakCustomer8: '12',
					leakCustomer9: '200%'
				},
				{
					leakCustomer1: '99',
					leakCustomer2: '1234567890123',
					leakCustomer3: '경기도 수원시 권선구',
					leakCustomer4: '9999',
					leakCustomer5: '가정용',
					leakCustomer6: '87',
					leakCustomer7: '9.9',
					leakCustomer8: '12',
					leakCustomer9: '200%'
				},
				{
					leakCustomer1: '99',
					leakCustomer2: '1234567890123',
					leakCustomer3: '경기도 수원시 권선구',
					leakCustomer4: '9999',
					leakCustomer5: '가정용',
					leakCustomer6: '87',
					leakCustomer7: '9.9',
					leakCustomer8: '12',
					leakCustomer9: '200%'
				}
			];
			for (i = 0; i <= leakCustom.length; i++) {
				$("#data-leakCustomer").jqGrid('addRowData', i + 1, leakCustom[i]);
			}
		}, 100);
	});



	//  # Caption   유수율 분석
	$("#wRateData-yearly").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wRateDataY,
		colNames: ['분석년', '총 급수량(m3)', '유수수량(m3)', '유수율(%)'],
		colModel: [{
				name: 'wRateDataY1',
				index: 'wRateDataY1',
				width: 100,
				align: 'center'
			},
			{
				name: 'wRateDataY2',
				index: 'wRateDataY2',
				width: 120,
				align: 'right'
			},
			{
				name: 'wRateDataY3',
				index: 'wRateDataY3',
				width: 120,
				align: 'right'
			},
			{
				name: 'wRateDataY4',
				index: 'wRateDataY4',
				width: 100,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	// $("#wRateData-yearly").jqGrid('setGroupHeaders', {
	//     useColSpanStyle: true,
	//     groupHeaders:[
	//         {startColumnName: 'leakCustomer7', numberOfColumns: 3, titleText: '요금부과량(m3/월)'}
	//     ]
	// });
	// td 데이터
	var wRateDataY = [{
			wRateDataY1: '2017',
			wRateDataY2: '10,000',
			wRateDataY3: '9,000',
			wRateDataY4: '200'
		},
		{
			wRateDataY1: '2017',
			wRateDataY2: '10,000',
			wRateDataY3: '9,000',
			wRateDataY4: '200'
		},
		{
			wRateDataY1: '2017',
			wRateDataY2: '10,000',
			wRateDataY3: '9,000',
			wRateDataY4: '200'
		},
		{
			wRateDataY1: '2017',
			wRateDataY2: '10,000',
			wRateDataY3: '9,000',
			wRateDataY4: '200'
		},
		{
			wRateDataY1: '2017',
			wRateDataY2: '10,000',
			wRateDataY3: '9,000',
			wRateDataY4: '200'
		}
	];
	for (i = 0; i <= wRateDataY.length; i++)
		$("#wRateData-yearly").jqGrid('addRowData', i + 1, wRateDataY[i]);
	//




	//  # Caption   유수율 분석
	$("#wRateData-monthly").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wRateDataM,
		colNames: ['분석년월', '총 급수량(m3)', '유수수량(m3)', '유수율(%)'],
		colModel: [{
				name: 'wRateDataM1',
				index: 'wRateDataM1',
				width: 100,
				align: 'center'
			},
			{
				name: 'wRateDataM2',
				index: 'wRateDataM2',
				width: 120,
				align: 'right'
			},
			{
				name: 'wRateDataM3',
				index: 'wRateDataM3',
				width: 120,
				align: 'right'
			},
			{
				name: 'wRateDataM4',
				index: 'wRateDataM4',
				width: 100,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	// $("#wRateData-yearly").jqGrid('setGroupHeaders', {
	//     useColSpanStyle: true,
	//     groupHeaders:[
	//         {startColumnName: 'leakCustomer7', numberOfColumns: 3, titleText: '요금부과량(m3/월)'}
	//     ]
	// });
	// td 데이터
	var wRateDataM = [{
			wRateDataM1: '2017.12',
			wRateDataM2: '10,000',
			wRateDataM3: '9,000',
			wRateDataM4: '200'
		},
		{
			wRateDataM1: '2017.11',
			wRateDataM2: '10,000',
			wRateDataM3: '9,000',
			wRateDataM4: '200'
		},
		{
			wRateDataM1: '2017.10',
			wRateDataM2: '10,000',
			wRateDataM3: '9,000',
			wRateDataM4: '200'
		},
		{
			wRateDataM1: '2017.09',
			wRateDataM2: '10,000',
			wRateDataM3: '9,000',
			wRateDataM4: '200'
		},
		{
			wRateDataM1: '2017.08',
			wRateDataM2: '10,000',
			wRateDataM3: '9,000',
			wRateDataM4: '200'
		}
	];
	for (i = 0; i <= wRateDataM.length; i++)
		$("#wRateData-monthly").jqGrid('addRowData', i + 1, wRateDataM[i]);
	//




	//  # Caption   유수율 분석
	$("#wRateData-daily").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wRateDataD,
		colNames: ['분석년월일', '총 급수량(m3)', '상수사용량(m3)'],
		colModel: [{
				name: 'wRateDataD1',
				index: 'wRateDataD1',
				width: 100,
				align: 'center'
			},
			{
				name: 'wRateDataD2',
				index: 'wRateDataD2',
				width: 160,
				align: 'right'
			},
			{
				name: 'wRateDataD3',
				index: 'wRateDataD3',
				width: 160,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	// $("#wRateData-yearly").jqGrid('setGroupHeaders', {
	//     useColSpanStyle: true,
	//     groupHeaders:[
	//         {startColumnName: 'leakCustomer7', numberOfColumns: 3, titleText: '요금부과량(m3/월)'}
	//     ]
	// });
	// td 데이터
	var wRateDataD = [{
			wRateDataD1: '2017.12',
			wRateDataD2: '10,000',
			wRateDataD3: '9,000',
			wRateDataD4: '200'
		},
		{
			wRateDataD1: '2017.11',
			wRateDataD2: '10,000',
			wRateDataD3: '9,000',
			wRateDataD4: '200'
		},
		{
			wRateDataD1: '2017.10',
			wRateDataD2: '10,000',
			wRateDataD3: '9,000',
			wRateDataD4: '200'
		},
		{
			wRateDataD1: '2017.09',
			wRateDataD2: '10,000',
			wRateDataD3: '9,000',
			wRateDataD4: '200'
		}
	];
	for (i = 0; i <= wRateDataD.length; i++)
		$("#wRateData-daily").jqGrid('addRowData', i + 1, wRateDataD[i]);
	//




	//  # Caption   누수량 분석
	$("#wLossData-yearly").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossDataY,
		colNames: ['분석년', '총 급수량(m3/년)', '누수량(m3/년)', '누수율(%)'],
		colModel: [{
				name: 'wLossDataY1',
				index: 'wLossDataY1',
				width: 120,
				align: 'center'
			},
			{
				name: 'wLossDataY2',
				index: 'wLossDataY2',
				width: 100,
				align: 'right'
			},
			{
				name: 'wLossDataY3',
				index: 'wLossDataY3',
				width: 100,
				align: 'right'
			},
			{
				name: 'wLossDataY4',
				index: 'wLossDataY4',
				width: 94,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var wLossDataY = [{
			wLossDataY1: '2017.12',
			wLossDataY2: '10,000',
			wLossDataY3: '9,000',
			wLossDataY4: '200'
		},
		{
			wLossDataY1: '2017.11',
			wLossDataY2: '10,000',
			wLossDataY3: '9,000',
			wLossDataY4: '200'
		},
		{
			wLossDataY1: '2017.10',
			wLossDataY2: '10,000',
			wLossDataY3: '9,000',
			wLossDataY4: '200'
		},
		{
			wLossDataY1: '2017.09',
			wLossDataY2: '10,000',
			wLossDataY3: '9,000',
			wLossDataY4: '200'
		}
	];
	for (i = 0; i <= wLossDataY.length; i++)
		$("#wLossData-yearly").jqGrid('addRowData', i + 1, wLossDataY[i]);
	//



	//  # Caption   누수량 분석
	$("#wLossData-monthly").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossDataM,
		colNames: ['분석년월', '총 급수량(m3/월)', '누수량(m3/월)', '누수율(%)'],
		colModel: [{
				name: 'wLossDataM1',
				index: 'wLossDataM1',
				width: 120,
				align: 'center'
			},
			{
				name: 'wLossDataM2',
				index: 'wLossDataM2',
				width: 100,
				align: 'right'
			},
			{
				name: 'wLossDataM3',
				index: 'wLossDataM3',
				width: 100,
				align: 'right'
			},
			{
				name: 'wLossDataM4',
				index: 'wLossDataM4',
				width: 94,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var wLossDataM = [{
			wLossDataM1: '2017.12',
			wLossDataM2: '10,000',
			wLossDataM3: '9,000',
			wLossDataM4: '200'
		},
		{
			wLossDataM1: '2017.11',
			wLossDataM2: '10,000',
			wLossDataM3: '9,000',
			wLossDataM4: '200'
		},
		{
			wLossDataM1: '2017.10',
			wLossDataM2: '10,000',
			wLossDataM3: '9,000',
			wLossDataM4: '200'
		},
		{
			wLossDataM1: '2017.09',
			wLossDataM2: '10,000',
			wLossDataM3: '9,000',
			wLossDataM4: '200'
		}
	];
	for (i = 0; i <= wLossDataM.length; i++)
		$("#wLossData-monthly").jqGrid('addRowData', i + 1, wLossDataM[i]);
	//



	//  # Caption   누수량 분석
	$("#wLossData-daily").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossDataD,
		colNames: ['분석년월일', '총 급수량(m3/d)', '누수량(m3/d)  '],
		colModel: [{
				name: 'wLossDataD1',
				index: 'wLossDataD1',
				width: 100,
				align: 'center'
			},
			{
				name: 'wLossDataD2',
				index: 'wLossDataD2',
				width: 110,
				align: 'right'
			},
			{
				name: 'wLossDataD3',
				index: 'wLossDataD3',
				width: 110,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var wLossDataD = [{
			wLossDataD1: '2017.12',
			wLossDataD2: '10,000',
			wLossDataD3: '9,000'
		},
		{
			wLossDataD1: '2017.11',
			wLossDataD2: '10,000',
			wLossDataD3: '9,000'
		},
		{
			wLossDataD1: '2017.10',
			wLossDataD2: '10,000',
			wLossDataD3: '9,000'
		},
		{
			wLossDataD1: '2017.09',
			wLossDataD2: '10,000',
			wLossDataD3: '9,000'
		}
	];
	for (i = 0; i <= wLossDataD.length; i++)
		$("#wLossData-daily").jqGrid('addRowData', i + 1, wLossDataD[i]);
	//



	//  # Caption   야간최소유량 분석
	$("#wLossNMFData-data").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossNMFDataMap,
		colNames: ['분석일자', '총 급수량\<br>(m3/d)', '평균수압\<br>(kgf/cm2)', '야간최소유량\<br>(L/hr)', '가정사용량', '비가정사용량', '예외적인사용량', '합계', '야간배경누수량', '야간파열누수량', '합계', '야간-일보정계수\<br>(NDF)', '누수량\<br>(m3/d)'],
		colModel: [{
				label: 'wLossNMF1',
				name: 'wLossNMF1',
				width: 120,
				align: 'left'
			},
			{
				label: 'wLossNMF2',
				name: 'wLossNMF2',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossNMF3',
				name: 'wLossNMF3',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossNMF4',
				name: 'wLossNMF4',
				width: 100,
				align: 'center'
			},
			{
				label: 'wLossNMF5',
				name: 'wLossNMF5',
				width: 110,
				align: 'center'
			},
			{
				label: 'wLossNMF6',
				name: 'wLossNMF6',
				width: 110,
				align: 'center'
			},
			{
				label: 'wLossNMF7',
				name: 'wLossNMF7',
				width: 110,
				align: 'center'
			},
			{
				label: 'wLossNMF8',
				name: 'wLossNMF8',
				width: 120,
				align: 'center'
			},
			{
				label: 'wLossNMF9',
				name: 'wLossNMF9',
				width: 110,
				align: 'center'
			},
			{
				label: 'wLossNMF10',
				name: 'wLossNMF10',
				width: 110,
				align: 'center'
			},
			{
				label: 'wLossNMF11',
				name: 'wLossNMF11',
				width: 120,
				align: 'center'
			},
			{
				label: 'wLossNMF12',
				name: 'wLossNMF12',
				width: 110,
				align: 'center'
			},
			{
				label: 'wLossNMF13',
				name: 'wLossNMF13',
				width: 100,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#wLossNMFData-data").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'wLossNMF5',
				numberOfColumns: 4,
				titleText: '야간사용량(L/hr)'
			},
			{
				startColumnName: 'wLossNMF9',
				numberOfColumns: 3,
				titleText: '야간누수량(L/hr)'
			}
		]
	});
	// td 데이터
	var wLossNMFDataMap = [{
		wLossNMF1: '2017.07.17',
		wLossNMF2: '45,000',
		wLossNMF3: '5.0',
		wLossNMF4: '9,000',
		wLossNMF5: '500',
		wLossNMF6: '300',
		wLossNMF7: '0',
		wLossNMF8: '800',
		wLossNMF9: '150',
		wLossNMF10: '50',
		wLossNMF11: '200',
		wLossNMF12: '1.2',
		wLossNMF13: '4,700'
	}, ];
	for (i = 0; i <= wLossNMFDataMap.length; i++)
		$("#wLossNMFData-data").jqGrid('addRowData', i + 1, wLossNMFDataMap[i]);
	//



	//  # Caption   야간최소유량 환경설정 : 환경설정이력
	$("#wLossNMFData-config-info").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossNMFinfoMap,
		colNames: ['등록/수정일자', '적용월'],
		colModel: [{
				name: 'wLossNMFinfo1',
				width: 120,
				align: 'center'
			},
			{
				name: 'wLossNMFinfo2',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var wLossNMFinfoMap = [{
		wLossNMFinfo1: '내용',
		wLossNMFinfo2: '내용'
	}];
	for (i = 0; i <= wLossNMFinfoMap.length; i++)
		$("#wLossNMFData-config-info").jqGrid('addRowData', i + 1, wLossNMFinfoMap[i]);
	//




	//  # Caption   야간최소유량 환경설정
	$("#wLossNMFData-config-data").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossNMFConfigMap,
		colNames: ['항목', '가정용\<br>(L/conn./hr)', '비가정용\<br>(L/conn./hr)', '배수관\<br>(L/km/hr)', '인입급수관\<br>(L/conn./hr)', '옥내급수관\<br>(L/conn./hr)'],
		colModel: [{
				label: 'wLossNMFConfig1',
				name: 'wLossNMFConfig1',
				width: 100,
				align: 'left'
			},
			{
				label: 'wLossNMFConfig2',
				name: 'wLossNMFConfig2',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossNMFConfig3',
				name: 'wLossNMFConfig3',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossNMFConfig4',
				name: 'wLossNMFConfig4',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossNMFConfig5',
				name: 'wLossNMFConfig5',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossNMFConfig6',
				name: 'wLossNMFConfig6',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#wLossNMFData-config-data").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'wLossNMFConfig2',
				numberOfColumns: 2,
				titleText: '야간사용량계수'
			},
			{
				startColumnName: 'wLossNMFConfig4',
				numberOfColumns: 3,
				titleText: '배경야간손실량계수'
			}
		]
	});
	// td 데이터
	var wLossNMFConfigMap = [{
		wLossNMFConfig1: '내용',
		wLossNMFConfig2: '1.7',
		wLossNMFConfig3: '8.0',
		wLossNMFConfig4: '40',
		wLossNMFConfig5: '3',
		wLossNMFConfig6: '1'
	}, ];
	for (i = 0; i <= wLossNMFConfigMap.length; i++)
		$("#wLossNMFData-config-data").jqGrid('addRowData', i + 1, wLossNMFConfigMap[i]);
	//




	//  # Caption   단계시험
	$("#wLossSTestData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossSTestDataMap,
		colNames: ['조사적용일자', '누수량<small>(m3/hr)</small>'],
		colModel: [{
				label: 'wLossSTestData1',
				name: 'wLossSTestData1',
				width: 100,
				align: 'center'
			},
			{
				label: 'wLossSTestData2',
				name: 'wLossSTestData2',
				width: 100,
				align: 'center'
			},
		],
		viewrecords: true,
		width: 'auto',
		height: '495',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var wLossSTestDataMap = [{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-12',
			wLossSTestData2: '3000'
		},
		{
			wLossSTestData1: '2018-12-25',
			wLossSTestData2: '3000'
		}
	];
	for (i = 0; i <= wLossSTestDataMap.length; i++)
		$("#wLossSTestData").jqGrid('addRowData', i + 1, wLossSTestDataMap[i]);
	//



	//  # Caption   누수량 종합 분석 결과
	$("#uAnaData-data").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: uAnaDataMap,
		colNames: ['분석일자', '총 급수량(m3/d)', '평균수압(kgf/cm2)', '야간최소유량(m3/hr)', '총괄수량수지분석', '야간최소유량분석', '단계시험'],
		colModel: [{
				label: 'uAnaData1',
				name: 'uAnaData1',
				width: 90,
				align: 'center'
			},
			{
				label: 'uAnaData2',
				name: 'uAnaData2',
				width: 90,
				align: 'center'
			},
			{
				label: 'uAnaData3',
				name: 'uAnaData3',
				width: 90,
				align: 'center'
			},
			{
				label: 'uAnaData4',
				name: 'uAnaData4',
				width: 90,
				align: 'center'
			},
			{
				label: 'uAnaData5',
				name: 'uAnaData5',
				width: 90,
				align: 'center'
			},
			{
				label: 'uAnaData6',
				name: 'uAnaData6',
				width: 90,
				align: 'center'
			},
			{
				label: 'uAnaData7',
				name: 'uAnaData7',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#uAnaData-data").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'uAnaData5',
			numberOfColumns: 3,
			titleText: '누수량(m3/d)'
		}]
	});
	// td 데이터
	var uAnaDataMap = [{
		uAnaData1: '2017.07.17',
		uAnaData2: '45,000',
		uAnaData3: '5.0',
		uAnaData4: '1,000',
		uAnaData5: '500',
		uAnaData6: '300',
		uAnaData7: '150'
	}, ];
	for (i = 0; i <= uAnaDataMap.length; i++)
		$("#uAnaData-data").jqGrid('addRowData', i + 1, uAnaDataMap[i]);
	//



	//  # Caption   송/배수관 누수량 분석 결과
	$("#wPipeData-data").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wPipeDataMap,
		colNames: ['분석일자', '송수관 누수량(m3/d)\<br>(광역5단계 하동분기) (A)', '일림배수지 (B)', '열림배수지 (C)', '연암배수지 (D)', '율전배수지 (E)', '호매실배수지 (F)', '합계'],
		colModel: [{
				label: 'wPipeData1',
				name: 'wPipeData1',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPipeData2',
				name: 'wPipeData2',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPipeData3',
				name: 'wPipeData3',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPipeData4',
				name: 'wPipeData4',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPipeData5',
				name: 'wPipeData5',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPipeData6',
				name: 'wPipeData6',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPipeData7',
				name: 'wPipeData7',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPipeData8',
				name: 'wPipeData8',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#wPipeData-data").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'wPipeData3',
			numberOfColumns: 6,
			titleText: '배수관 누수량(m3/d) (배수지 유출 ~ 소블록 유입)'
		}]
	});
	// td 데이터
	var wPipeDataMap = [{
		wPipeData1: '2018.12.25',
		wPipeData2: '12',
		wPipeData3: '5',
		wPipeData4: '6',
		wPipeData5: '5',
		wPipeData6: '3',
		wPipeData7: '5',
		wPipeData8: '15'
	}, ];
	for (i = 0; i <= wPipeDataMap.length; i++)
		$("#wPipeData-data").jqGrid('addRowData', i + 1, wPipeDataMap[i]);
	//






	//  # Caption   누수감시
	$("#wLossMTR-data").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wLossMTRMap,
		colNames: ['일자', '야간최소유량(m3/hr)', '야간평균수압(kgf/cm2)', 'ESPB(건)', '급수전당(m3/hr/conn.)', '관연장당(m3/hr/km)', '상태 감시'],
		colModel: [{
				label: 'wLossMTR1',
				name: 'wLossMTR1',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossMTR2',
				name: 'wLossMTR2',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossMTR3',
				name: 'wLossMTR3',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossMTR4',
				name: 'wLossMTR4',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossMTR5',
				name: 'wLossMTR5',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossMTR6',
				name: 'wLossMTR6',
				width: 90,
				align: 'center'
			},
			{
				label: 'wLossMTR7',
				name: 'wLossMTR7',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		hoverrows: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#wLossMTR-data").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'wLossMTR4',
			numberOfColumns: 3,
			titleText: '야간파열누수량'
		}]
	});
	// td 데이터
	var wLossMTRMap = [{
			wLossMTR1: '2018.12.25',
			wLossMTR2: '120',
			wLossMTR3: '5.0',
			wLossMTR4: '10',
			wLossMTR5: '0.068',
			wLossMTR6: '0.96',
			wLossMTR7: '정상'
		},
		{
			wLossMTR1: '2018.12.25',
			wLossMTR2: '120',
			wLossMTR3: '5.0',
			wLossMTR4: '10',
			wLossMTR5: '0.068',
			wLossMTR6: '0.96',
			wLossMTR7: '정상'
		},
		{
			wLossMTR1: '2018.12.25',
			wLossMTR2: '120',
			wLossMTR3: '5.0',
			wLossMTR4: '10',
			wLossMTR5: '0.068',
			wLossMTR6: '0.96',
			wLossMTR7: '누수징후'
		},
		{
			wLossMTR1: '2018.12.25',
			wLossMTR2: '120',
			wLossMTR3: '5.0',
			wLossMTR4: '10',
			wLossMTR5: '0.068',
			wLossMTR6: '0.96',
			wLossMTR7: '정상'
		},
		{
			wLossMTR1: '2018.12.25',
			wLossMTR2: '120',
			wLossMTR3: '5.0',
			wLossMTR4: '10',
			wLossMTR5: '0.068',
			wLossMTR6: '0.96',
			wLossMTR7: '정상'
		}
	];
	for (i = 0; i <= wLossMTRMap.length; i++)
		$("#wLossMTR-data").jqGrid('addRowData', i + 1, wLossMTRMap[i]);
	//





	//  # Caption   수압분석 결과
	$("#wPressData-data").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wPressDataMap,
		colNames: ['측정일자', '블록 유입부 수압\<br><small>(kgf/cm2)</small>', '평균수압지점의 수압\<br><small>(kgf/cm2)</small>', '평균수압지점의 야간수압(NAZP)\<br><small>(kgf/cm2)</small>', '임계지점 수압\<br><small>(kgf/cm2)</small>', '수압상태 판단'],
		colModel: [{
				label: 'wPressData1',
				name: 'wPressData1',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPressData2',
				name: 'wPressData2',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPressData3',
				name: 'wPressData3',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPressData4',
				name: 'wPressData4',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPressData5',
				name: 'wPressData5',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPressData6',
				name: 'wPressData6',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		hoverrows: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var wPressDataMap = [{
			wPressData1: '2018.12.25',
			wPressData2: '12',
			wPressData3: '5',
			wPressData4: '6',
			wPressData5: '5',
			wPressData6: '3'
		},
		{
			wPressData1: '2018.12.25',
			wPressData2: '12',
			wPressData3: '5',
			wPressData4: '6',
			wPressData5: '5',
			wPressData6: '3'
		},
		{
			wPressData1: '2018.12.25',
			wPressData2: '12',
			wPressData3: '5',
			wPressData4: '6',
			wPressData5: '5',
			wPressData6: '3'
		},
		{
			wPressData1: '2018.12.25',
			wPressData2: '12',
			wPressData3: '5',
			wPressData4: '6',
			wPressData5: '5',
			wPressData6: '3'
		},
		{
			wPressData1: '2018.12.25',
			wPressData2: '12',
			wPressData3: '5',
			wPressData4: '6',
			wPressData5: '5',
			wPressData6: '3'
		}
	];
	for (i = 0; i <= wPressDataMap.length; i++)
		$("#wPressData-data").jqGrid('addRowData', i + 1, wPressDataMap[i]);
	//




	//  # Caption   패턴분석
	$("#wPattern-data").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: wPatternMap,
		colNames: ['구분', '평균유량(m3/hr)', '평균수압(kgf/cm2)', '유량', '수압'],
		colModel: [{
				label: 'wPattern1',
				name: 'wPattern1',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPattern2',
				name: 'wPattern2',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPattern3',
				name: 'wPattern3',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPattern4',
				name: 'wPattern4',
				width: 90,
				align: 'center'
			},
			{
				label: 'wPattern5',
				name: 'wPattern5',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#wPattern-data").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'wPattern4',
			numberOfColumns: 2,
			titleText: '패턴'
		}]
	});
	// td 데이터
	var wPatternMap = [{
			wPattern1: '00:00',
			wPattern2: '120',
			wPattern3: '5.0',
			wPattern4: '10',
			wPattern5: '0.068'
		},
		{
			wPattern1: '01:00',
			wPattern2: '120',
			wPattern3: '5.0',
			wPattern4: '10',
			wPattern5: '0.068'
		},
		{
			wPattern1: '02:00',
			wPattern2: '120',
			wPattern3: '5.0',
			wPattern4: '10',
			wPattern5: '0.068'
		},
		{
			wPattern1: '03:00',
			wPattern2: '120',
			wPattern3: '5.0',
			wPattern4: '10',
			wPattern5: '0.068'
		},
		{
			wPattern1: '04:00',
			wPattern2: '120',
			wPattern3: '5.0',
			wPattern4: '10',
			wPattern5: '0.068'
		}
	];
	for (i = 0; i <= wPatternMap.length; i++)
		$("#wPattern-data").jqGrid('addRowData', i + 1, wPatternMap[i]);
	//





	//  # Caption      사용량예측 과거데이터
	$("#uPred-history").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: uPredHMap,
		colNames: ['일자', '사용량(m3/d)', '가중치'],
		colModel: [{
				label: 'uPredH1',
				name: 'uPredH1',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredH2',
				name: 'uPredH2',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredH3',
				name: 'uPredH3',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var uPredHMap = [{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		},
		{
			uPredH1: '2017.07.23',
			uPredH2: '120',
			uPredH3: '5.0'
		}
	];
	for (i = 0; i <= uPredHMap.length; i++)
		$("#uPred-history").jqGrid('addRowData', i + 1, uPredHMap[i]);
	//





	//  # Caption      사용량예측 일단위
	$("#uPred-daily").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: uPredDMap,
		colNames: ['일자', '예측값(m3/d)', '실측값(m3/d)', '정확도(%)'],
		colModel: [{
				label: 'uPredD1',
				name: 'uPredD1',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredD2',
				name: 'uPredD2',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredD3',
				name: 'uPredD3',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredD4',
				name: 'uPredD4',
				width: 70,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var uPredDMap = [{
			uPredD1: '2017.07.23',
			uPredD2: '120',
			uPredD3: '500',
			uPredD4: '100'
		},
		{
			uPredD1: '2017.07.23',
			uPredD2: '120',
			uPredD3: '500',
			uPredD4: '100'
		},
		{
			uPredD1: '2017.07.23',
			uPredD2: '120',
			uPredD3: '500',
			uPredD4: '100'
		},
		{
			uPredD1: '2017.07.23',
			uPredD2: '120',
			uPredD3: '500',
			uPredD4: '100'
		},
		{
			uPredD1: '2017.07.23',
			uPredD2: '120',
			uPredD3: '500',
			uPredD4: '100'
		},
		{
			uPredD1: '2017.07.23',
			uPredD2: '120',
			uPredD3: '500',
			uPredD4: '100'
		}
	];
	for (i = 0; i <= uPredDMap.length; i++)
		$("#uPred-daily").jqGrid('addRowData', i + 1, uPredDMap[i]);
	//





	//  # Caption      사용량예측 시간단위
	$("#uPred-time").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: uPredTMap,
		colNames: ['일자', '예측값(m3/hr)', '실측값(m3/hr)', '정확도(%)'],
		colModel: [{
				label: 'uPredT1',
				name: 'uPredT1',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredT2',
				name: 'uPredT2',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredT3',
				name: 'uPredT3',
				width: 90,
				align: 'center'
			},
			{
				label: 'uPredT4',
				name: 'uPredT4',
				width: 70,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var uPredTMap = [{
			uPredT1: '00:00',
			uPredT2: '120',
			uPredT3: '500',
			uPredT4: '100'
		},
		{
			uPredT1: '00:00',
			uPredT2: '120',
			uPredT3: '500',
			uPredT4: '100'
		},
		{
			uPredT1: '00:00',
			uPredT2: '120',
			uPredT3: '500',
			uPredT4: '100'
		},
		{
			uPredT1: '00:00',
			uPredT2: '120',
			uPredT3: '500',
			uPredT4: '100'
		},
		{
			uPredT1: '00:00',
			uPredT2: '120',
			uPredT3: '500',
			uPredT4: '100'
		},
		{
			uPredT1: '00:00',
			uPredT2: '120',
			uPredT3: '500',
			uPredT4: '100'
		},
		{
			uPredT1: '00:00',
			uPredT2: '120',
			uPredT3: '500',
			uPredT4: '100'
		}
	];
	for (i = 0; i <= uPredTMap.length; i++)
		$("#uPred-time").jqGrid('addRowData', i + 1, uPredTMap[i]);
	//




	//  # Caption      추세분석 :실시간 데이터 추세분석
	$("#trendDataA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: trendDataAMap,
		colNames: ['일자', '실측', '과거\<br>추세', '오차(%)', '실측', '과거\<br>추세', '오차(%)'],
		colModel: [{
				label: 'trendDataA1',
				name: 'trendDataA1',
				width: 110,
				align: 'left'
			},
			{
				label: 'trendDataA2',
				name: 'trendDataA2',
				width: 72,
				align: 'center'
			},
			{
				label: 'trendDataA3',
				name: 'trendDataA3',
				width: 72,
				align: 'center'
			},
			{
				label: 'trendDataA4',
				name: 'trendDataA4',
				width: 72,
				align: 'center'
			},
			{
				label: 'trendDataA5',
				name: 'trendDataA5',
				width: 72,
				align: 'center'
			},
			{
				label: 'trendDataA6',
				name: 'trendDataA6',
				width: 72,
				align: 'center'
			},
			{
				label: 'trendDataA7',
				name: 'trendDataA7',
				width: 72,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#trendDataA").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'trendDataA2',
				numberOfColumns: 3,
				titleText: '유량(m3/min)'
			},
			{
				startColumnName: 'trendDataA5',
				numberOfColumns: 3,
				titleText: '수압(kgf/cm2)'
			}
		]
	});
	// td 데이터
	var trendDataAMap = [{
		trendDataA1: '2017.07.01\<br>00:00',
		trendDataA2: '120',
		trendDataA3: '500',
		trendDataA4: '100',
		trendDataA5: '100',
		trendDataA6: '100',
		trendDataA7: '100'
	}];
	for (i = 0; i <= trendDataAMap.length; i++)
		$("#trendDataA").jqGrid('addRowData', i + 1, trendDataAMap[i]);
	//




	//  # Caption      추세분석 : 유수율/누수량 추세분석
	$("#trendDataB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: trendDataBMap,
		colNames: ['일자', '분석값', '과거\<br>추세', '오차', '분석값', '과거\<br>추세', '오차'],
		colModel: [{
				label: 'trendDataB1',
				name: 'trendDataB1',
				width: 110,
				align: 'left'
			},
			{
				label: 'trendDataB2',
				name: 'trendDataB2',
				width: 74,
				align: 'center'
			},
			{
				label: 'trendDataB3',
				name: 'trendDataB3',
				width: 74,
				align: 'center'
			},
			{
				label: 'trendDataB4',
				name: 'trendDataB4',
				width: 74,
				align: 'center'
			},
			{
				label: 'trendDataB5',
				name: 'trendDataB5',
				width: 74,
				align: 'center'
			},
			{
				label: 'trendDataB6',
				name: 'trendDataB6',
				width: 74,
				align: 'center'
			},
			{
				label: 'trendDataB7',
				name: 'trendDataB7',
				width: 74,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#trendDataB").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'trendDataB2',
				numberOfColumns: 3,
				titleText: '유수율(%)'
			},
			{
				startColumnName: 'trendDataB5',
				numberOfColumns: 3,
				titleText: '누수량(m3/month)'
			}
		]
	});
	// td 데이터
	var trendDataBMap = [{
		trendDataB1: '2017. 01',
		trendDataB2: '120',
		trendDataB3: '500',
		trendDataB4: '100',
		trendDataB5: '100',
		trendDataB6: '100',
		trendDataB7: '100'
	}];
	for (i = 0; i <= trendDataBMap.length; i++)
		$("#trendDataB").jqGrid('addRowData', i + 1, trendDataBMap[i]);
	//




	//  # Caption      추세분석 : 평균수압-누수량 발생경향 분석
	$("#trendDataC").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: trendDataCMap,
		colNames: ['일자', '평균수압(kgf/cm2)', '누수량(m3/month)'],
		colModel: [{
				label: 'trendDataC1',
				name: 'trendDataC1',
				width: 110,
				align: 'left'
			},
			{
				label: 'trendDataC2',
				name: 'trendDataC2',
				width: 140,
				align: 'center'
			},
			{
				label: 'trendDataC3',
				name: 'trendDataC3',
				width: 140,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var trendDataCMap = [{
		trendDataC1: '2017. 01',
		trendDataC2: '120',
		trendDataC3: '500'
	}];
	for (i = 0; i <= trendDataCMap.length; i++)
		$("#trendDataC").jqGrid('addRowData', i + 1, trendDataCMap[i]);
	//




	//  # Caption      관망진단 : 관망진단(일반기술진단) 이력
	$("#diagDataA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: diagDataAMap,
		colNames: ['진단기간', '평가등급', '평가점수', '진단인', '진단일자'],
		colModel: [{
				label: 'diagDataA1',
				name: 'diagDataA1',
				width: 200,
				align: 'center'
			},
			{
				label: 'diagDataA2',
				name: 'diagDataA2',
				width: 120,
				align: 'center'
			},
			{
				label: 'diagDataA3',
				name: 'diagDataA3',
				width: 112,
				align: 'center'
			},
			{
				label: 'diagDataA4',
				name: 'diagDataA4',
				width: 112,
				align: 'center'
			},
			{
				label: 'diagDataA5',
				name: 'diagDataA5',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		height: '900',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var diagDataAMap = [{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		},
		{
			diagDataA1: '2015.01.01 ~ 2015.12.31',
			diagDataA2: '<span class="text-primary">120</span>',
			diagDataA3: '500',
			diagDataA4: '조관망',
			diagDataA5: '2016.06.17'
		}
	];
	for (i = 0; i <= diagDataAMap.length; i++)
		$("#diagDataA").jqGrid('addRowData', i + 1, diagDataAMap[i]);
	//




	//  # Caption      관망진단 : 평균수압-누수량 발생경향 분석
	$("#diagDataB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: diagDataBMap,
		colNames: ['진단항목', '평가등급', '평가점수', '가중치', '설정'],
		colModel: [{
				label: 'diagDataB1',
				name: 'diagDataB1',
				width: 200,
				align: 'center'
			},
			{
				label: 'diagDataB2',
				name: 'diagDataB2',
				width: 100,
				align: 'center'
			},
			{
				label: 'diagDataB3',
				name: 'diagDataB3',
				width: 90,
				align: 'center'
			},
			{
				label: 'diagDataB4',
				name: 'diagDataB4',
				width: 90,
				align: 'center'
			},
			{
				label: 'diagDataB5',
				name: 'diagDataB5',
				width: 80,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		height: '900',
		autowidth: true,
		shrinkToFit: true // 가로 스크롤바
	});
	// td 데이터
	var diagDataBMap = [{
			diagDataB1: '총괄평가',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>', // 우수
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#diag-valuation1">설정1</button>'
		},
		{
			diagDataB1: '관망도 정비 빈도',
			diagDataB2: '<i class="fas fa-circle text-primary pr-2"></i><span class="text-black-50">양호</span>', // 양호
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#diag-valuation2">설정2</button>'
		},
		{
			diagDataB1: 'GIS 도입 여부',
			diagDataB2: '<i class="fas fa-circle text-info pr-2"></i><span class="text-black-50">보통</span>', // 보통
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm" data-toggle="modal" data-target="#diag-valuation3">설정3</button>'
		},
		{
			diagDataB1: '소블록 평균 급수전수',
			diagDataB2: '<i class="fas fa-circle text-warning pr-2"></i><span class="text-black-50">불량</span>', // 불량
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '배수지 청소 빈도',
			diagDataB2: '<i class="fas fa-circle text-danger pr-2"></i><span class="text-black-50">심각</span>', // 심각
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '배수지 체류시간',
			diagDataB2: '<i class="fas fa-circle text-danger pr-2"></i><span class="text-black-50">심각</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '배수지 평균연령',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '인입급수관 평균연령',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '비내식성 비율',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '펌프 점검률',
			diagDataB2: '<i class="fas fa-circle text-info pr-2"></i><span class="text-black-50">보통</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '유효 밸브밀도',
			diagDataB2: '<i class="fas fa-circle text-info pr-2"></i><span class="text-black-50">보통</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '밸브 점검률',
			diagDataB2: '<i class="fas fa-circle text-info pr-2"></i><span class="text-black-50">보통</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '소화전 설치밀도',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '소화전 점검률',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '감압밸브 점검빈도',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '유수율',
			diagDataB2: '<i class="fas fa-circle text-success pr-2"></i><span class="text-black-50">우수</span>',
			diagDataB3: '92',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
		{
			diagDataB1: '최소수압 미달전수',
			diagDataB2: '<i class="fas fa-circle text-warning pr-2"></i><span class="text-black-50">불량</span>', // 불량
			diagDataB3: '59',
			diagDataB4: '001',
			diagDataB5: '<button type="button" class="btn btn-outline-primary btn-sm">설정</button>'
		},
	];
	for (i = 0; i <= diagDataBMap.length; i++)
		$("#diagDataB").jqGrid('addRowData', i + 1, diagDataBMap[i]);
	//




	//  # Caption      집중관리 블록 우선순위 조회
	$("#orderData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: orderDataMap,
		colNames: [
			'대블록', '중블록', '소블록', '유수율\<br><small>(%)</small>', '급수전당\<br>무수수량', '배수관연장당\<br>무수수량',
			'일 평균\<br>누수량', '급수전당\<br>평균누수량', '배수관연장당\<br>누수량', '야간파열\<br>누수량', '급수전당\<br><small>(m3/hr/conn.)</small>', '배수관연장당\<br><small>(m3/hr/km)</small>', '종합\<br>우선순위'
		],
		colModel: [{
				label: 'orderData1',
				name: 'orderData1',
				width: 160,
				align: 'center'
			},
			{
				label: 'orderData2',
				name: 'orderData2',
				width: 90,
				align: 'center'
			},
			{
				label: 'orderData3',
				name: 'orderData3',
				width: 70,
				align: 'center'
			},
			{
				label: 'orderData4',
				name: 'orderData4',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData5',
				name: 'orderData5',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData6',
				name: 'orderData6',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData7',
				name: 'orderData7',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData8',
				name: 'orderData8',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData9',
				name: 'orderData9',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData10',
				name: 'orderData10',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData11',
				name: 'orderData11',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData12',
				name: 'orderData12',
				width: 110,
				align: 'center'
			},
			{
				label: 'orderData13',
				name: 'orderData13',
				width: 80,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: true // 가로 스크롤바
	});
	// Header 그룹핑
	$("#orderData").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'orderData4',
				numberOfColumns: 3,
				titleText: '유수율 기준'
			},
			{
				startColumnName: 'orderData7',
				numberOfColumns: 3,
				titleText: '누수량 기준(야간법)'
			},
			{
				startColumnName: 'orderData10',
				numberOfColumns: 3,
				titleText: '야간파열누수량 기준'
			}
		]
	});
	// td 데이터
	var orderDataMap = [{
		orderData1: '광역5단계 하동분기',
		orderData2: '일림배수지',
		orderData3: '일림1',
		orderData4: '91',
		orderData5: '20',
		orderData6: '20',
		orderData7: '20',
		orderData8: '20',
		orderData9: '20',
		orderData10: '3.9',
		orderData11: '20',
		orderData12: '20',
		orderData13: '1'
	}, ];
	for (i = 0; i <= orderDataMap.length; i++)
		$("#orderData").jqGrid('addRowData', i + 1, orderDataMap[i]);
	//



	//  # Caption      수압제어분석 : 수압제어(고정제어)
	$("#pcAnlDataA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: pcAnlDataAMap,
		colNames: ['측정일자', '요일', '인입수압\<br><small>(kgf/cm2)</small>', '토출 수압\<br><small>(kgf/cm2)</small>', '수압제어값 분석(고정제어)\<br><small>(kgf/cm2)</small>'],
		colModel: [{
				label: 'pcAnlDataA1',
				name: 'pcAnlDataA1',
				width: 160,
				align: 'center'
			},
			{
				label: 'pcAnlDataA2',
				name: 'pcAnlDataA2',
				width: 80,
				align: 'center'
			},
			{
				label: 'pcAnlDataA3',
				name: 'pcAnlDataA3',
				width: 122,
				align: 'center'
			},
			{
				label: 'pcAnlDataA4',
				name: 'pcAnlDataA4',
				width: 122,
				align: 'center'
			},
			{
				label: 'pcAnlDataA5',
				name: 'pcAnlDataA5',
				width: 180,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var pcAnlDataAMap = [{
			pcAnlDataA1: '2015.01.01',
			pcAnlDataA2: '수',
			pcAnlDataA3: '3.12',
			pcAnlDataA4: '5.00',
			pcAnlDataA5: '4.99'
		},
		{
			pcAnlDataA1: '2015.01.01',
			pcAnlDataA2: '수',
			pcAnlDataA3: '3.12',
			pcAnlDataA4: '5.00',
			pcAnlDataA5: '4.99'
		},
		{
			pcAnlDataA1: '2015.01.01',
			pcAnlDataA2: '수',
			pcAnlDataA3: '3.12',
			pcAnlDataA4: '5.00',
			pcAnlDataA5: '4.99'
		},
		{
			pcAnlDataA1: '2015.01.01',
			pcAnlDataA2: '수',
			pcAnlDataA3: '3.12',
			pcAnlDataA4: '5.00',
			pcAnlDataA5: '4.99'
		}
	];
	for (i = 0; i <= pcAnlDataAMap.length; i++)
		$("#pcAnlDataA").jqGrid('addRowData', i + 1, pcAnlDataAMap[i]);
	//




	//  # Caption      수압제어분석 : 수압제어(시간제어 / 유량비례제어)
	$("#pcAnlDataB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: pcAnlDataBMap,
		colNames: ['대블록측정일자', '인입 수압\<br><small>(kgf/cm2)</small>', '토출 수압\<br><small>(kgf/cm2)</small>', '시간제어', '유량비례제어'],
		colModel: [{
				label: 'pcAnlDataB1',
				name: 'pcAnlDataB1',
				width: 200,
				align: 'center'
			},
			{
				label: 'pcAnlDataB2',
				name: 'pcAnlDataB2',
				width: 110,
				align: 'center'
			},
			{
				label: 'pcAnlDataB3',
				name: 'pcAnlDataB3',
				width: 120,
				align: 'center'
			},
			{
				label: 'pcAnlDataB4',
				name: 'pcAnlDataB4',
				width: 120,
				align: 'center'
			},
			{
				label: 'pcAnlDataB5',
				name: 'pcAnlDataB5',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#pcAnlDataB").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'pcAnlDataB4',
			numberOfColumns: 2,
			titleText: '수압제어값 분석<small>(kgf/cm2)</small>'
		}]
	});
	// td 데이터
	var pcAnlDataBMap = [{
			pcAnlDataB1: '2017.07.17 00:00',
			pcAnlDataB2: '3.12',
			pcAnlDataB3: '5.00',
			pcAnlDataB4: '4.70',
			pcAnlDataB5: '4.60'
		},
		{
			pcAnlDataB1: '2017.07.17 00:00',
			pcAnlDataB2: '3.12',
			pcAnlDataB3: '5.00',
			pcAnlDataB4: '4.70',
			pcAnlDataB5: '4.60'
		},
		{
			pcAnlDataB1: '2017.07.17 00:00',
			pcAnlDataB2: '3.12',
			pcAnlDataB3: '5.00',
			pcAnlDataB4: '4.70',
			pcAnlDataB5: '4.60'
		},
		{
			pcAnlDataB1: '2017.07.17 00:00',
			pcAnlDataB2: '3.12',
			pcAnlDataB3: '5.00',
			pcAnlDataB4: '4.70',
			pcAnlDataB5: '4.60'
		},
		{
			pcAnlDataB1: '2017.07.17 00:00',
			pcAnlDataB2: '3.12',
			pcAnlDataB3: '5.00',
			pcAnlDataB4: '4.70',
			pcAnlDataB5: '4.60'
		}
	];
	for (i = 0; i <= pcAnlDataBMap.length; i++)
		$("#pcAnlDataB").jqGrid('addRowData', i + 1, pcAnlDataBMap[i]);
	//




	//  # Caption      수압제어분석 : 수압제어(시간제어 / 유량비례제어)
	$("#dataBasic").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataBasicMap,
		colNames: ['적용일', '블록면적(ha)', ' 급수전수(수용가수)', '소화전수', '인구', '맨홀갯수', '유량계수', '수압계수', '변류시설수', '저수조수', '급수관연장(km)', '상수관연장(km)', '급수관평균관경(mm)', '상수관평균관경(mm)', '급수관수', '상수관수', '관접속수', '삭제'],
		colModel: [{
				name: 'dataBasic1',
				width: 130,
				align: 'center'
			},
			{
				name: 'dataBasic2',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataBasic3',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic4',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic5',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic6',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic7',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic8',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic9',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic10',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic11',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic12',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic13',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic14',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic15',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic16',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic17',
				width: 128,
				align: 'center'
			},
			{
				name: 'dataBasic18',
				width: 60,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var dataBasicMap = [{
		dataBasic1: '2017.07.17',
		dataBasic2: '3.12',
		dataBasic3: '5.00',
		dataBasic4: '4.70',
		dataBasic5: '40',
		dataBasic6: '0',
		dataBasic7: '3',
		dataBasic8: '5',
		dataBasic9: '4',
		dataBasic10: '40',
		dataBasic11: '2',
		dataBasic12: '3.12',
		dataBasic13: '5.00',
		dataBasic14: '4.70',
		dataBasic15: '4.60',
		dataBasic16: '123',
		dataBasic17: '3.12',
		dataBasic18: '<button type="button" class="btn btn-sm btn-link text-danger">삭제</button>'
	}];
	for (i = 0; i <= dataBasicMap.length; i++)
		$("#dataBasic").jqGrid('addRowData', i + 1, dataBasicMap[i]);
	//





	//  # Caption      블록가압장 설정
	$("#dataPoint").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataPointMap,
		colNames: ['펌프명', '양정(m)', '유량(m3/hr)', '동력(kW)', '마력(HP)', 'rpm', '효율(%)', '실유량(m3/hr)', '제품명', '일련번호', '제조사', '담당자', '연락처'],
		colModel: [{
				name: 'dataPoint1',
				width: 80,
				align: 'center'
			},
			{
				name: 'dataPoint2',
				width: 70,
				align: 'center'
			},
			{
				name: 'dataPoint3',
				width: 70,
				align: 'center'
			},
			{
				name: 'dataPoint4',
				width: 70,
				align: 'center'
			},
			{
				name: 'dataPoint5',
				width: 70,
				align: 'center'
			},
			{
				name: 'dataPoint6',
				width: 70,
				align: 'center'
			},
			{
				name: 'dataPoint7',
				width: 70,
				align: 'center'
			},
			{
				name: 'dataPoint8',
				width: 70,
				align: 'center'
			},
			{
				name: 'dataPoint9',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataPoint10',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataPoint11',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataPoint12',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataPoint13',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		height: '260',
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#dataPoint").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'dataPoint2',
			numberOfColumns: 6,
			titleText: '제원정보'
		}]
	});
	// td 데이터
	var dataPointMap = [{
		dataPoint1: '펌프 A',
		dataPoint2: '10',
		dataPoint3: '98',
		dataPoint4: '100',
		dataPoint5: '123',
		dataPoint6: '123',
		dataPoint7: '123',
		dataPoint8: '98',
		dataPoint9: '한일펌프',
		dataPoint10: 'A-100',
		dataPoint11: '한일전자',
		dataPoint12: 'OOO',
		dataPoint13: '000-0000-0000'
	}];
	for (i = 0; i <= dataPointMap.length; i++)
		$("#dataPoint").jqGrid('addRowData', i + 1, dataPointMap[i]);
	//





	//  # Caption      경보 설정
	$("#dataalarmA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataalarmAMap,
		colNames: ['사용', '오류내용', '경보한계 하한값', '경보한계 상한값', 'SMS', 'eMail', 'Fax', 'Voice', 'UMS'],
		colModel: [{
				name: 'dataalarmA1',
				width: 40,
				align: 'center'
			},
			{
				name: 'dataalarmA2',
				width: 160,
				align: 'center'
			},
			{
				name: 'dataalarmA3',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataalarmA4',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataalarmA5',
				width: 50,
				align: 'center'
			},
			{
				name: 'dataalarmA6',
				width: 50,
				align: 'center'
			},
			{
				name: 'dataalarmA7',
				width: 50,
				align: 'center'
			},
			{
				name: 'dataalarmA8',
				width: 50,
				align: 'center'
			},
			{
				name: 'dataalarmA9',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var dataalarmAMap = [{
			dataalarmA1: '<input type="checkbox" name="alarm-block-use" checked="checked">',
			dataalarmA2: '통신 정상',
			dataalarmA3: '98',
			dataalarmA4: '100',
			dataalarmA5: '<input type="checkbox" name="alarm-block-set" option="sms">',
			dataalarmA6: '<input type="checkbox" name="alarm-block-set" option="email">',
			dataalarmA7: '<input type="checkbox" name="alarm-block-set" option="fax">',
			dataalarmA8: '<input type="checkbox" name="alarm-block-set" option="voice">',
			dataalarmA9: '<span class="text-info mx-1">담당자1</span><span class="text-info mx-1">담당자2</span>'
		},
		{
			dataalarmA1: '<input type="checkbox" name="alarm-block-use" checked="checked">',
			dataalarmA2: '통신 비정상',
			dataalarmA3: '98',
			dataalarmA4: '100',
			dataalarmA5: '<input type="checkbox" name="alarm-block-set" option="sms">',
			dataalarmA6: '<input type="checkbox" name="alarm-block-set" option="email">',
			dataalarmA7: '<input type="checkbox" name="alarm-block-set" option="fax">',
			dataalarmA8: '<input type="checkbox" name="alarm-block-set" option="voice">',
			dataalarmA9: '<span class="text-info mx-1">담당자1</span><span class="text-info mx-1">담당자2</span>'
		},
		{
			dataalarmA1: '<input type="checkbox" name="alarm-block-use" checked="checked">',
			dataalarmA2: '유량데이터 범위 초과',
			dataalarmA3: '98',
			dataalarmA4: '100',
			dataalarmA5: '<input type="checkbox" name="alarm-block-set" option="sms">',
			dataalarmA6: '<input type="checkbox" name="alarm-block-set" option="email">',
			dataalarmA7: '<input type="checkbox" name="alarm-block-set" option="fax">',
			dataalarmA8: '<input type="checkbox" name="alarm-block-set" option="voice">',
			dataalarmA9: '<span class="text-info mx-1">담당자1</span><span class="text-info mx-1">담당자2</span>'
		}
	];
	for (i = 0; i <= dataalarmAMap.length; i++)
		$("#dataalarmA").jqGrid('addRowData', i + 1, dataalarmAMap[i]);
	//




	//  # Caption      경보 설정2
	$("#dataalarmB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataalarmBMap,
		colNames: ['선택', 'ID', '수신인'],
		colModel: [{
				name: 'dataalarmB1',
				width: 40,
				align: 'center'
			},
			{
				name: 'dataalarmB2',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataalarmB3',
				width: 100,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var dataalarmBMap = [{
			dataalarmB1: '<input type="checkbox" name="alarm-block-choice" checked="checked">',
			dataalarmB2: 'admin',
			dataalarmB3: '담당자1'
		},
		{
			dataalarmB1: '<input type="checkbox" name="alarm-block-choice">',
			dataalarmB2: 'admin',
			dataalarmB3: '담당자2'
		}
	];
	for (i = 0; i <= dataalarmBMap.length; i++)
		$("#dataalarmB").jqGrid('addRowData', i + 1, dataalarmBMap[i]);
	//




	//  # Caption      비정상 데이터 설정 : 확정성 필터링
	$("#dataFinalA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataFinalAMap,
		colNames: ['일시', '구분', '기간', '항목', '등록자'],
		colModel: [{
				name: 'dataFinalA1',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataFinalA2',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataFinalA3',
				width: 120,
				align: 'center'
			},
			{
				name: 'dataFinalA4',
				width: 80,
				align: 'center'
			},
			{
				name: 'dataFinalA5',
				width: 70,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var dataFinalAMap = [{
		dataFinalA1: '2018.12.20',
		dataFinalA2: '구분내용',
		dataFinalA3: '2018.09.16 ~ 2018.09.16',
		dataFinalA4: '항목내용',
		dataFinalA5: '담당자1'
	}];
	for (i = 0; i <= dataFinalAMap.length; i++)
		$("#dataFinalA").jqGrid('addRowData', i + 1, dataFinalAMap[i]);
	//




	//  # Caption      비정상 데이터 설정 : 확정성 필터링
	$("#dataFinalB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataFinalBMap,
		colNames: ['일시', '구분', '기간', '항목', '등록자'],
		colModel: [{
				name: 'dataFinalB1',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataFinalB2',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataFinalB3',
				width: 120,
				align: 'center'
			},
			{
				name: 'dataFinalB4',
				width: 80,
				align: 'center'
			},
			{
				name: 'dataFinalB5',
				width: 70,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var dataFinalBMap = [{
		dataFinalB1: '2018.12.20',
		dataFinalB2: '구분내용',
		dataFinalB3: '2018.09.16 ~ 2018.09.16',
		dataFinalB4: '항목내용',
		dataFinalB5: '담당자1'
	}];
	for (i = 0; i <= dataFinalBMap.length; i++)
		$("#dataFinalB").jqGrid('addRowData', i + 1, dataFinalBMap[i]);
	//




	//  # Caption      비정상 데이터 설정 : 판정성 필터링 - 유량
	$("#dataDecisionA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataDecisionAMap,
		colNames: ['적용일', '유량', '수압', '하한값', '상한값', '하한값', '상한값', '일단위 유효레코드<br>확보율(%)'],
		colModel: [{
				name: 'dataDecisionA1',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataDecisionA2',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataDecisionA3',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataDecisionA4',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataDecisionA5',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionA6',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionA7',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionA8',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#dataDecisionA").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'dataDecisionA2',
				numberOfColumns: 2,
				titleText: '결측치 체크'
			},
			{
				startColumnName: 'dataDecisionA4',
				numberOfColumns: 2,
				titleText: '유량'
			},
			{
				startColumnName: 'dataDecisionA6',
				numberOfColumns: 2,
				titleText: '수압'
			}
		]
	});
	// td 데이터
	var dataDecisionAMap = [{
		dataDecisionA1: '2018.12.20',
		dataDecisionA2: '<input type="checkbox" name="" option="" id="decision-check-yr" />',
		dataDecisionA3: '<input type="checkbox" name="" option="" id="decision-check-sa" />',
		dataDecisionA4: '0.123',
		dataDecisionA5: '0.123',
		dataDecisionA6: '2018.12.20',
		dataDecisionA7: '0.123',
		dataDecisionA8: '400'
	}];
	for (i = 0; i <= dataDecisionAMap.length; i++)
		$("#dataDecisionA").jqGrid('addRowData', i + 1, dataDecisionAMap[i]);
	//





	//  # Caption      비정상 데이터 설정 : 판정성 필터링 - 수질
	$("#dataDecisionB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: dataDecisionBMap,
		colNames: ['적용일', '탁도', 'pH', '염소', '전기', '하한값', '상한값', '하한값', '상한값', '하한값', '상한값', '하한값', '상한값', '일단위 유효레코드<br>확보율(%)'],
		colModel: [{
				name: 'dataDecisionB1',
				width: 100,
				align: 'center'
			},
			{
				name: 'dataDecisionB2',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataDecisionB3',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataDecisionB4',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataDecisionB5',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB6',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB7',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB8',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB9',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB10',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB11',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB12',
				width: 60,
				align: 'center'
			},
			{
				name: 'dataDecisionB13',
				width: 90,
				align: 'center'
			},
			{
				name: 'dataDecisionB14',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#dataDecisionB").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'dataDecisionB2',
				numberOfColumns: 4,
				titleText: '결측치 체크'
			},
			{
				startColumnName: 'dataDecisionB6',
				numberOfColumns: 2,
				titleText: '탁도'
			},
			{
				startColumnName: 'dataDecisionB8',
				numberOfColumns: 2,
				titleText: 'pH'
			},
			{
				startColumnName: 'dataDecisionB10',
				numberOfColumns: 2,
				titleText: '잔류염소'
			},
			{
				startColumnName: 'dataDecisionB12',
				numberOfColumns: 2,
				titleText: '전기전도도'
			}
		]
	});
	// td 데이터
	var dataDecisionBMap = [{
		dataDecisionB1: '2018.12.20',
		dataDecisionB2: '0.123',
		dataDecisionB3: '0.123',
		dataDecisionB4: '0.123',
		dataDecisionB5: '0.123',
		dataDecisionB6: '2018.12.20',
		dataDecisionB7: '0.123',
		dataDecisionB8: '0.123',
		dataDecisionB9: '0.123',
		dataDecisionB10: '0.123',
		dataDecisionB11: '0.123',
		dataDecisionB12: '0.123',
		dataDecisionB13: '0.123',
		dataDecisionB14: '100'
	}];
	for (i = 0; i <= dataDecisionBMap.length; i++)
		$("#dataDecisionB").jqGrid('addRowData', i + 1, dataDecisionBMap[i]);
	//




	//  # Caption      비정상 데이터 설정 : 사용자 임의 필터링(유량)
	$("#datafpFree").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: datafpFreeMap,
		colNames: ['측정일시', '측정값(L)', '범위판정', '불연속Zero', '임의판정', '종합결과', '확정성 판단', '최종판단', '측정값(kgf/cm2)', '범위판정', '불연속Zero', '임의판정', '종합결과', '확정성 판단', '최종판단'],
		colModel: [{
				name: 'datafpFree1',
				width: 140,
				align: 'center'
			},
			{
				name: 'datafpFree2',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree3',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree4',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree5',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree6',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree7',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree8',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree9',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree10',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree11',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree12',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree13',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree14',
				width: 86,
				align: 'center'
			},
			{
				name: 'datafpFree15',
				width: 86,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#datafpFree").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'datafpFree2',
				numberOfColumns: 7,
				titleText: '유량'
			},
			{
				startColumnName: 'datafpFree9',
				numberOfColumns: 7,
				titleText: '수압'
			}
		]
	});
	// Header 그룹핑 2
	$("#datafpFree").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'datafpFree3',
				numberOfColumns: 4,
				titleText: '판정성 판단'
			},
			{
				startColumnName: 'datafpFree10',
				numberOfColumns: 4,
				titleText: '판정성 판단'
			}
		]
	});
	// td 데이터
	var datafpFreeMap = [{
		datafpFree1: '2018.12.20 09:00',
		datafpFree2: 'Y',
		datafpFree3: '-',
		datafpFree4: '-',
		datafpFree5: '??',
		datafpFree6: 'Y',
		datafpFree7: 'Y',
		datafpFree8: '-',
		datafpFree9: '0.123',
		datafpFree10: 'Y',
		datafpFree11: '-',
		datafpFree12: '??',
		datafpFree13: 'Y',
		datafpFree14: 'Y',
		datafpFree15: '-',
	}];
	for (i = 0; i <= datafpFreeMap.length; i++)
		$("#datafpFree").jqGrid('addRowData', i + 1, datafpFreeMap[i]);
	//




	//  # Caption      비정상 데이터 설정 : 사용자 임의 필터링(수질)
	$("#datawqFree").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: datawqFreeMap,
		colNames: ['측정일시', '측정값<br><small class="text-secondary">(NTU)</small>', '범위판정', '불연속Zero', '임의판정', '결과', '확정성 판단', '최종 판단', '측정값', '범위판정', '불연속Zero', '임의판정', '결과', '확정성 판단', '최종 판단', '측정값(mg/L)', '범위판정', '불연속Zero', '임의판정', '결과', '확정성 판단', '최종 판단', '측정값(us/cm2)', '범위판정', '불연속Zero', '임의판정', '결과', '확정성 판단', '최종 판단', '측정값(‘C)', '범위판정', '불연속Zero', '임의판정', '결과', '확정성 판단', '최종 판단'],
		colModel: [{
				name: 'datawqFree1',
				width: 140,
				align: 'center'
			},
			{
				name: 'datawqFree2',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree3',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree4',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree5',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree6',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree7',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree8',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree9',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree10',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree11',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree12',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree13',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree14',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree15',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree16',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree17',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree18',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree19',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree20',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree21',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree22',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree23',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree24',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree25',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree26',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree27',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree28',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree29',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree30',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree31',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree32',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree33',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree34',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree35',
				width: 72,
				align: 'center'
			},
			{
				name: 'datawqFree36',
				width: 72,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑
	$("#datawqFree").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'datawqFree2',
				numberOfColumns: 7,
				titleText: '탁도'
			},
			{
				startColumnName: 'datawqFree9',
				numberOfColumns: 7,
				titleText: 'pH'
			},
			{
				startColumnName: 'datawqFree16',
				numberOfColumns: 7,
				titleText: '잔류염소'
			},
			{
				startColumnName: 'datawqFree23',
				numberOfColumns: 7,
				titleText: '전기전도도'
			},
			{
				startColumnName: 'datawqFree30',
				numberOfColumns: 7,
				titleText: '수온'
			}
		]
	});
	// Header 그룹핑 2
	$("#datawqFree").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'datawqFree3',
				numberOfColumns: 4,
				titleText: '판정성 판단'
			},
			{
				startColumnName: 'datawqFree10',
				numberOfColumns: 4,
				titleText: '판정성 판단'
			},
			{
				startColumnName: 'datawqFree17',
				numberOfColumns: 4,
				titleText: '판정성 판단'
			},
			{
				startColumnName: 'datawqFree24',
				numberOfColumns: 4,
				titleText: '판정성 판단'
			},
			{
				startColumnName: 'datawqFree31',
				numberOfColumns: 4,
				titleText: '판정성 판단'
			}
		]
	});
	// td 데이터
	var datawqFreeMap = [{
		datawqFree1: '2018.12.20 09:00',
		datawqFree2: 'NTU',
		datawqFree3: '탁도',
		datawqFree4: 'Y',
		datawqFree5: 'Y',
		datawqFree6: 'N',
		datawqFree7: 'Y',
		datawqFree8: 'pH',
		datawqFree9: '0.123',
		datawqFree10: 'pH',
		datawqFree11: 'Y',
		datawqFree12: 'Y',
		datawqFree13: 'Y',
		datawqFree14: 'Y',
		datawqFree15: 'N',
		datawqFree16: '잔류염소',
		datawqFree17: '0.123',
		datawqFree18: '-',
		datawqFree19: '-',
		datawqFree20: '-',
		datawqFree21: '-',
		datawqFree22: '-',
		datawqFree23: '전기전도도',
		datawqFree24: '0.123',
		datawqFree25: '??',
		datawqFree26: '??',
		datawqFree27: '??',
		datawqFree28: '??',
		datawqFree29: '??',
		datawqFree30: '수온',
		datawqFree31: '0.123',
		datawqFree32: 'Y',
		datawqFree33: 'Y',
		datawqFree34: 'Y',
		datawqFree35: 'Y',
		datawqFree36: 'Y'
	}];
	for (i = 0; i <= datawqFreeMap.length; i++)
		$("#datawqFree").jqGrid('addRowData', i + 1, datawqFreeMap[i]);
	//



	//  # Caption      오프라인 데이터 등록 : 유량/수압 A
	$("#offDatafpA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: offDatafpAMap,
		colNames: ['측정일시', '순시유량', '적산유량', '수압', '삭제'],
		colModel: [{
				name: 'offDatafpA1',
				width: 120,
				align: 'center'
			},
			{
				name: 'offDatafpA2',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatafpA3',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatafpA4',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatafpA5',
				width: 50,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var offDatafpAMap = [{
		offDatafpA1: '2018-12-20 12:07',
		offDatafpA2: '78.334',
		offDatafpA3: '123456',
		offDatafpA4: '99.999',
		offDatafpA5: '<input type="checkbox">'
	}];
	for (i = 0; i <= offDatafpAMap.length; i++)
		$("#offDatafpA").jqGrid('addRowData', i + 1, offDatafpAMap[i]);
	//



	//  # Caption      오프라인 데이터 등록 : 유량/수압 B
	$("#offDatafpB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: offDatafpBMap,
		colNames: ['측정일시', '순시유량(L/min)', '적산유량(m3)', '수압(kgf/cm2)'],
		colModel: [{
				name: 'offDatafpB1',
				width: 120,
				align: 'center'
			},
			{
				name: 'offDatafpB2',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatafpB3',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatafpB4',
				width: 100,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var offDatafpBMap = [{
		offDatafpB1: '2018-12-20 12:07',
		offDatafpB2: '7812.34',
		offDatafpB3: '123456.00',
		offDatafpB4: '99.999'
	}];
	for (i = 0; i <= offDatafpBMap.length; i++)
		$("#offDatafpB").jqGrid('addRowData', i + 1, offDatafpBMap[i]);
	//



	//  # Caption      오프라인 데이터 등록 : 수질
	$("#offDatawq").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: offDatawqMap,
		colNames: ['측정일', '측정시간', 'pH', '탁도NTU', '잔류염소(mg/L)', '전기전도도(us/cm2)'],
		colModel: [{
				name: 'offDatawq1',
				width: 80,
				align: 'center'
			},
			{
				name: 'offDatawq2',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatawq3',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatawq4',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatawq5',
				width: 100,
				align: 'center'
			},
			{
				name: 'offDatawq6',
				width: 100,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var offDatawqMap = [{
			offDatawq1: '2018-12-20',
			offDatawq2: '12:00',
			offDatawq3: '123456.00',
			offDatawq4: '123456.00',
			offDatawq5: '123456.00',
			offDatawq6: '123456.00'
		},
		{
			offDatawq1: '',
			offDatawq2: '',
			offDatawq3: '',
			offDatawq4: '',
			offDatawq5: '총 데이터수 : 7',
			offDatawq6: '정상 데이터수 : 7'
		}
	];
	for (i = 0; i <= offDatawqMap.length; i++)
		$("#offDatawq").jqGrid('addRowData', i + 1, offDatawqMap[i]);
	//



	//  # Caption      적산유량초기화 A
	$("#acculnitDataA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: acculnitDataAMap,
		colNames: ['지점명', '05-01', '05-02', '05-03', '05-04', '05-05', '05-06', '05-07', '05-08', '05-09', '05-10', '05-11', '05-12', '05-13', '05-14', '05-15', '05-16', '05-17'],
		colModel: [{
				name: 'acculnitDataA1',
				width: 140,
				align: 'center'
			},
			{
				name: 'acculnitDataA2',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA3',
				width: 110,
				align: 'right',
				classes: 'text-danger'
			},
			{
				name: 'acculnitDataA4',
				width: 110,
				align: 'right',
				classes: 'text-danger'
			},
			{
				name: 'acculnitDataA5',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA6',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA7',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA8',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA9',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA10',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA11',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA12',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA13',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA14',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA15',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA16',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA17',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			},
			{
				name: 'acculnitDataA18',
				width: 110,
				align: 'right',
				classes: 'text-primary'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var acculnitDataAMap = [{
		acculnitDataA1: '마동고지대배수지',
		acculnitDataA2: '123,456,900.00',
		acculnitDataA3: '-300,987,654.00',
		acculnitDataA4: '-123,456,900.00',
		acculnitDataA5: '123,456,900.00',
		acculnitDataA6: '123,456,900.00',
		acculnitDataA7: '123,456,900.00',
		acculnitDataA8: '123,456,900.00',
		acculnitDataA9: '123,456,900.00',
		acculnitDataA10: '123,456,900.00',
		acculnitDataA11: '123,456,900.00',
		acculnitDataA12: '123,456,900.00',
		acculnitDataA13: '123,456,900.00',
		acculnitDataA14: '123,456,900.00',
		acculnitDataA15: '123,456,900.00',
		acculnitDataA16: '123,456,900.00',
		acculnitDataA17: '123,456,900.00',
		acculnitDataA18: '123,456,900.00'
	}];
	for (i = 0; i <= acculnitDataAMap.length; i++)
		$("#acculnitDataA").jqGrid('addRowData', i + 1, acculnitDataAMap[i]);
	//



	//  # Caption      적산유량초기화 B
	$("#acculnitDataB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: acculnitDataBMap,
		colNames: ['날짜', '시간', '유량', '적산', '데이터수집'],
		colModel: [{
				name: 'acculnitDataB1',
				width: 100,
				align: 'center'
			},
			{
				name: 'acculnitDataB2',
				width: 80,
				align: 'right'
			},
			{
				name: 'acculnitDataB3',
				width: 90,
				align: 'right',
				classes: 'text-primary'
			}, // Blue Text
			{
				name: 'acculnitDataB4',
				width: 100,
				align: 'right',
				classes: 'text-primary'
			}, // Blue Text
			{
				name: 'acculnitDataB5',
				width: 120,
				align: 'right'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var acculnitDataBMap = [{
		acculnitDataB1: '2018-09-29',
		acculnitDataB2: '00:00',
		acculnitDataB3: '6254.00',
		acculnitDataB4: '123,900.00',
		acculnitDataB5: '20180929 0925'
	}];
	for (i = 0; i <= acculnitDataBMap.length; i++)
		$("#acculnitDataB").jqGrid('addRowData', i + 1, acculnitDataBMap[i]);
	//



	//  # Caption      적산유량초기화 C
	$("#acculnitDataC").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: acculnitDataCMap,
		colNames: ['삭제', '블록명', '날짜', '변경', '신규', '원본', '사유', '수정일'],
		colModel: [{
				name: 'acculnitDataC1',
				width: 40,
				align: 'center'
			},
			{
				name: 'acculnitDataC2',
				width: 100,
				align: 'center'
			},
			{
				name: 'acculnitDataC3',
				width: 90,
				align: 'center'
			},
			{
				name: 'acculnitDataC4',
				width: 50,
				align: 'center'
			},
			{
				name: 'acculnitDataC5',
				width: 70,
				align: 'right'
			},
			{
				name: 'acculnitDataC6',
				width: 110,
				align: 'right'
			},
			{
				name: 'acculnitDataC7',
				width: 120,
				align: 'center'
			},
			{
				name: 'acculnitDataC8',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var acculnitDataCMap = [{
		acculnitDataC1: '<input type="checkbox">',
		acculnitDataC2: '땡땡 블록',
		acculnitDataC3: '2018-09-29', // Blue
		acculnitDataC4: '99',
		acculnitDataC5: '<strong class="text-danger">123</strong>',
		acculnitDataC6: '<strong class="text-primary">123,900.00</strong>',
		acculnitDataC7: '시스템 구축시험',
		acculnitDataC8: '<input type="text" class="form-control form-control-sm" value="2018-12-30 12:09:57">'
	}];
	for (i = 0; i <= acculnitDataCMap.length; i++)
		$("#acculnitDataC").jqGrid('addRowData', i + 1, acculnitDataCMap[i]);



	//  # Caption      이벤트 기록 조회
	$("#eLogView").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: eLogViewMap,
		colNames: ['시간', '이벤트명', '유량(L)', '수압(kgf/cm2)', '탁도(NTU)', 'pH', '염소(mg/L)', '전기전도도(μS/cm2)'],
		colModel: [{
				name: 'eLogView1',
				width: 120,
				align: 'center'
			},
			{
				name: 'eLogView2',
				width: 140,
				align: 'center'
			},
			{
				name: 'eLogView3',
				width: 90,
				align: 'center'
			},
			{
				name: 'eLogView4',
				width: 90,
				align: 'center'
			},
			{
				name: 'eLogView5',
				width: 90,
				align: 'center'
			},
			{
				name: 'eLogView6',
				width: 90,
				align: 'center'
			},
			{
				name: 'eLogView7',
				width: 90,
				align: 'center'
			},
			{
				name: 'eLogView8',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#eLogView").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'eLogView3',
			numberOfColumns: 6,
			titleText: '측정값'
		}]
	});
	// td 데이터
	var eLogViewMap = [{
		eLogView1: '2016-09-24 12:57:02',
		eLogView2: '유량데이터 범위 초과',
		eLogView3: '12345.00',
		eLogView4: '12345.00',
		eLogView5: '12345.00',
		eLogView6: '12345.00',
		eLogView7: '12345.00',
		eLogView8: '12345.00'
	}];
	for (i = 0; i <= eLogViewMap.length; i++)
		$("#eLogView").jqGrid('addRowData', i + 1, eLogViewMap[i]);
	//


	// -------------------------------- 통합 관리 시스템 ----------------------------------- //


	//  # Caption	-- 수요예측 - 월단위
	$("#upResultA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: upResultAMap,
		colNames: ['월', '실적유량 <small>(m3/d)</small>', '예측유량 <small>(m3/d)</small>', '정확도 <small>(%)</small>'],
		colModel: [{
				name: 'upResultA1',
				width: 60,
				align: 'center'
			},
			{
				name: 'upResultA2',
				width: 160,
				align: 'center'
			},
			{
				name: 'upResultA3',
				width: 100,
				align: 'center'
			},
			{
				name: 'upResultA4',
				width: 100,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#upResultA").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'upResultA3',
			numberOfColumns: 2,
			titleText: '수요 예측'
		}]
	});
	// td 데이터
	var upResultAMap = [{
		upResultA1: '1월',
		upResultA2: '선택시 상세내용??',
		upResultA3: '999',
		upResultA4: '120%'
	}];
	for (i = 0; i <= upResultAMap.length; i++)
		$("#upResultA").jqGrid('addRowData', i + 1, upResultAMap[i]);
	//


	//  # Caption	-- 수요예측 - 일단위
	$("#upResultB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: upResultBMap,
		colNames: ['일자', '실적 유량 <small>(m3/d)</small>', '수요예측', '운영모의', '수요예측\<br>정확도 <small>(%)</small>'],
		colModel: [{
				name: 'upResultB1',
				width: 140,
				align: 'center'
			},
			{
				name: 'upResultB2',
				width: 160,
				align: 'center'
			},
			{
				name: 'upResultB3',
				width: 90,
				align: 'center'
			},
			{
				name: 'upResultB4',
				width: 90,
				align: 'center'
			},
			{
				name: 'upResultB5',
				width: 80,
				align: 'center'
			},
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#upResultB").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'upResultB3',
			numberOfColumns: 2,
			titleText: '예측유량 <small>(m3/d)</small>'
		}]
	});
	// td 데이터
	var upResultBMap = [{
		upResultB1: '2018-12-30',
		upResultB2: '선택시 상세내용??',
		upResultB3: '999',
		upResultB4: '999%',
		upResultB4: '120%'
	}];
	for (i = 0; i <= upResultBMap.length; i++)
		$("#upResultB").jqGrid('addRowData', i + 1, upResultBMap[i]);
	//



	//  # Caption	-- 수요예측 - 시간단위
	$("#upResultC").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: upResultCMap,
		colNames: ['일자', '실적 유량 <small>(m3/d)</small>', '수요예측', '운영모의', '수요예측\<br>정확도 <small>(%)</small>'],
		colModel: [{
				name: 'upResultC1',
				width: 140,
				align: 'center'
			},
			{
				name: 'upResultC2',
				width: 160,
				align: 'center'
			},
			{
				name: 'upResultC3',
				width: 90,
				align: 'center'
			},
			{
				name: 'upResultC4',
				width: 90,
				align: 'center'
			},
			{
				name: 'upResultC5',
				width: 80,
				align: 'center'
			},
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#upResultC").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'upResultC3',
			numberOfColumns: 2,
			titleText: '예측유량 <small>(m3/d)</small>'
		}]
	});
	// td 데이터
	var upResultCMap = [{
		upResultC1: '00:00 - 12:00',
		upResultC2: '100',
		upResultC3: '999',
		upResultC4: '999',
		upResultC5: '120%'
	}];
	for (i = 0; i <= upResultCMap.length; i++)
		$("#upResultC").jqGrid('addRowData', i + 1, upResultCMap[i]);
	//


	//  # Caption	-- 배수지 운영
	$("#planData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: planDataMap,
		colNames: ['일자', '유입유량', '유출유량', '수위(m)', '변경유입유량', '예측유출유량', '수위(m)', '유출', '수위', '전력 요금 단가\<br><small>(원/kWh)</small>'],
		colModel: [{
				name: 'planData1',
				width: 120,
				align: 'center'
			},
			{
				name: 'planData2',
				width: 80,
				align: 'center'
			},
			{
				name: 'planData3',
				width: 80,
				align: 'center',
				classes: 'alert-danger'
			}, // 이 클래스를 특정 Cell(tr)에 넣어줘야함
			{
				name: 'planData4',
				width: 80,
				align: 'center'
			},
			{
				name: 'planData5',
				width: 80,
				align: 'center'
			},
			{
				name: 'planData6',
				width: 80,
				align: 'center'
			},
			{
				name: 'planData7',
				width: 80,
				align: 'center'
			},
			{
				name: 'planData8',
				width: 60,
				align: 'center'
			},
			{
				name: 'planData9',
				width: 60,
				align: 'center'
			},
			{
				name: 'planData10',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#planData").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'planData2',
				numberOfColumns: 3,
				titleText: '배수지 실측유량 <small>m3/hr</small>'
			},
			{
				startColumnName: 'planData5',
				numberOfColumns: 3,
				titleText: '배수지 예측유량 <small>m3/hr</small>'
			},
			{
				startColumnName: 'planData8',
				numberOfColumns: 2,
				titleText: '오차 <small>(%)</small>'
			}
		]
	});
	// td 데이터
	var planDataMap = [{
		planData1: '2018-12-30 00:00 - 12:00',
		planData2: '899',
		planData3: '이 부분(경고) "cell"에 적용',
		planData4: '000',
		planData4: '123',
		planData5: '123',
		planData6: '123',
		planData7: '123',
		planData8: '120%',
		planData9: '200%',
		planData10: '99999'
	}];
	for (i = 0; i <= planDataMap.length; i++)
		$("#planData").jqGrid('addRowData', i + 1, planDataMap[i]);
	//


	//  # Caption	-- 수량 배분
	$("#divideData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: divideDataMap,
		colNames: ['시간', '계획유량', '실적유량', '정확도(%)'],
		colModel: [{
				name: 'divideData1',
				width: 120,
				align: 'center'
			},
			{
				name: 'divideData2',
				width: 120,
				align: 'center'
			},
			{
				name: 'divideData3',
				width: 120,
				align: 'center'
			},
			{
				name: 'divideData4',
				width: 80,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var divideDataMap = [{
		divideData1: '00:00 - 12:00',
		divideData2: '10',
		divideData3: '10',
		divideData4: '100%'
	}];
	for (i = 0; i <= divideDataMap.length; i++)
		$("#divideData").jqGrid('addRowData', i + 1, divideDataMap[i]);
	//


	//  # Caption	-- 배수패턴모의 - 공급량추이조회 : 월단위
	$("#spTrendA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spTrendAMap,
		colNames: ['월', '공급량 <small>(m3/m)</small>', '계절구분'],
		colModel: [{
				name: 'spTrendA1',
				width: 80,
				align: 'center'
			},
			{
				name: 'spTrendA2',
				width: 160,
				align: 'center'
			},
			{
				name: 'spTrendA3',
				width: 100,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var spTrendAMap = [{
		spTrendA1: '2018-12',
		spTrendA2: '9,999',
		spTrendA3: '겨울'
	}];
	for (i = 0; i <= spTrendAMap.length; i++)
		$("#spTrendA").jqGrid('addRowData', i + 1, spTrendAMap[i]);
	//


	//  # Caption	-- 배수패턴모의 - 공급량추이조회 : 시간단위
	$("#spTrendB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spTrendBMap,
		colNames: ['월', '공급량 <small>(m3/d)</small>', '요일', '기상(기온)', '특이일'],
		colModel: [{
				name: 'spTrendB1',
				width: 80,
				align: 'center'
			},
			{
				name: 'spTrendB2',
				width: 120,
				align: 'center'
			},
			{
				name: 'spTrendB3',
				width: 80,
				align: 'center'
			},
			{
				name: 'spTrendB4',
				width: 120,
				align: 'center'
			},
			{
				name: 'spTrendB5',
				width: 140,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var spTrendBMap = [{
		spTrendB1: '00일',
		spTrendB2: '9,999',
		spTrendB3: '월',
		spTrendB4: '26~30℃',
		spTrendB5: '명절(설날)'
	}];
	for (i = 0; i <= spTrendBMap.length; i++)
		$("#spTrendB").jqGrid('addRowData', i + 1, spTrendBMap[i]);
	//


	//  # Caption	-- 배수패턴모의 - 공급량추이조회 : 일단위
	$("#spTrendC").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spTrendCMap,
		colNames: ['시간', '공급량 <small>(m3/hr)</small>'],
		colModel: [{
				name: 'spTrendC1',
				width: 80,
				align: 'center'
			},
			{
				name: 'spTrendC2',
				width: 160,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var spTrendCMap = [{
		spTrendC1: '00:00 - 12:00',
		spTrendC2: '9,999'
	}];
	for (i = 0; i <= spTrendCMap.length; i++)
		$("#spTrendC").jqGrid('addRowData', i + 1, spTrendCMap[i]);
	//


	//  # Caption	-- 배수패턴모의 - 배수패턴모의 조회
	$("#spViewA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spViewAMap,
		colNames: ['배수패턴 생성 이력', '생성구분', '삭제'],
		colModel: [{
				name: 'spViewA1',
				width: 200,
				align: 'center'
			},
			{
				name: 'spViewA2',
				width: 200,
				align: 'center'
			},
			{
				name: 'spViewA3',
				width: 40,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var spViewAMap = [{
		spViewA1: '2018년 1분기',
		spViewA2: '수동',
		spViewA3: '<button class="btn btn-sm btn-link text-danger">삭제</button>'
	}];
	for (i = 0; i <= spViewAMap.length; i++)
		$("#spViewA").jqGrid('addRowData', i + 1, spViewAMap[i]);
	//


	//  # Caption	-- 배수패턴모의 - 배수패턴모의 조회 B
	$("#spViewB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spViewBMap,
		colNames: ['시간', '배수패턴'],
		colModel: [{
				name: 'spViewB1',
				width: 200,
				align: 'center'
			},
			{
				name: 'spViewB2',
				width: 200,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// td 데이터
	var spViewBMap = [{
		spViewB1: '00:00 - 01:00',
		spViewB2: '9,999'
	}];
	for (i = 0; i <= spViewBMap.length; i++)
		$("#spViewB").jqGrid('addRowData', i + 1, spViewBMap[i]);
	//



	//  # Caption	-- 배수패턴모의 - 배수패턴모의 조회 C
	$("#spViewselect1").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spViewselect1Map,
		colNames: ['요일별'],
		colModel: [{
			name: 'spViewselect1',
			align: 'center'
		}],
		viewrecords: true,
		autowidth: true,
		height: '720',
		shrinkToFit: true
	});
	// td 데이터
	var spViewselect1Map = [{
		spViewselect1: 
		'<div class="selectbox"><select class="form-control form-control-sm">\
			<option>해당없음</option>\
			<option>월요일</option>\
			<option>화요일</option>\
			<option>수요일</option>\
			<option>목요일</option>\
			<option>금요일</option>\
			<option>토요일</option>\
			<option>일요일</option>\
		</select></div>'
	}];
	for (i = 0; i <= spViewselect1Map.length; i++)
		$("#spViewselect1").jqGrid('addRowData', i + 1, spViewselect1Map[i]);
	//

	$("#spViewselect2").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spViewselect2Map,
		colNames: ['기상별(기온)'],
		colModel: [{
			name: 'spViewselect2',
			align: 'center'
		}],
		viewrecords: true,
		autowidth: true,
		height: '720',
		shrinkToFit: true
	});
	// td 데이터
	var spViewselect2Map = [{
		spViewselect2: 
		'<div class="selectbox"><select class="form-control form-control-sm">\
			<option>해당없음</option>\
			<option>-20~-16℃</option>\
			<option>-15~-11℃</option>\
			<option>-10~-6℃</option>\
			<option>-5~-1℃</option>\
			<option>0~5℃</option>\
			<option>6~10℃</option>\
			<option>11~15℃</option>\
			<option>16~20℃</option>\
			<option>21~25℃</option>\
			<option>26~30℃</option>\
			<option>31~35℃</option>\
			<option>36~40℃</option>\
		</select></div>'
	}];
	for (i = 0; i <= spViewselect2Map.length; i++)
		$("#spViewselect2").jqGrid('addRowData', i + 1, spViewselect2Map[i]);
	//
	$("#spViewselect3").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: spViewselect3Map,
		colNames: ['특이일별'],
		colModel: [{
			name: 'spViewselect3',
			align: 'center'
		}],
		viewrecords: true,
		autowidth: true,
		height: '720',
		shrinkToFit: true
	});
	// td 데이터
	var spViewselect3Map = [{
		spViewselect3: 
		'<div class="selectbox"><select class="form-control form-control-sm">\
			<option>해당없음</option>\
			<option>공휴일</option>\
			<option>명절(신정)</option>\
			<option>명절(설날)-전일</option>\
			<option>명절(설날)-당일</option>\
			<option>명절(설날)-후일</option>\
			<option>명절(추석)-전일</option>\
			<option>명절(추석)-당일</option>\
			<option>명절(추석)-후일</option>\
		</select></div>'
	}];
	for (i = 0; i <= spViewselect3Map.length; i++)
		$("#spViewselect3").jqGrid('addRowData', i + 1, spViewselect3Map[i]);
	//


	//  # Caption	-- 생산관리 - 펌프 운전 계획
	$("#pumpPlanData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: pumpPlanDataMap,
		colNames: ['시간', '초기 배수지 저류량\<br><small>(m3)</small>', '배수지 수요예측량\<br><small>(m3/hr)</small>', '전력요금단가\<br><small>(kWh/원)</small>', '가압장 계획 송수량\<br><small>(m3/hr)</small>', 'A펌프', 'B펌프', 'C펌프', 'D펌프', 'E펌프', 'F펌프'],
		colModel: [{
				name: 'pumpPlanData1',
				width: 140,
				align: 'center'
			},
			{
				name: 'pumpPlanData2',
				width: 160,
				align: 'center'
			},
			{
				name: 'pumpPlanData3',
				width: 160,
				align: 'center'
			},
			{
				name: 'pumpPlanData4',
				width: 160,
				align: 'center'
			},
			{
				name: 'pumpPlanData5',
				width: 160,
				align: 'center'
			},
			{
				name: 'pumpPlanData6',
				width: 80,
				align: 'center',
				classes: 'text-success'
			},
			{
				name: 'pumpPlanData7',
				width: 80,
				align: 'center',
				classes: 'text-danger'
			},
			{
				name: 'pumpPlanData8',
				width: 80,
				align: 'center',
				classes: 'text-success'
			},
			{
				name: 'pumpPlanData9',
				width: 80,
				align: 'center',
				classes: 'text-danger'
			},
			{
				name: 'pumpPlanData10',
				width: 80,
				align: 'center',
				classes: 'text-success'
			},
			{
				name: 'pumpPlanData11',
				width: 80,
				align: 'center',
				classes: 'text-danger'
			}
		],
		viewrecords: true,
		width: 'auto',
		height: '430',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#pumpPlanData").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'pumpPlanData6',
			numberOfColumns: 6,
			titleText: '펌프 운전 계획'
		}]
	});
	// td 데이터
	var pumpPlanDataMap = [{
			pumpPlanData1: '00:00 - 01:00',
			pumpPlanData2: '9,999',
			pumpPlanData3: '9,999',
			pumpPlanData4: '9,999',
			pumpPlanData5: '9,999',
			pumpPlanData6: 'O',
			pumpPlanData7: 'X',
			pumpPlanData8: 'O',
			pumpPlanData9: 'X',
			pumpPlanData10: 'O',
			pumpPlanData11: 'X'
		},
		{
			pumpPlanData1: '00:00 - 01:00'
		},
		{
			pumpPlanData1: '01:00 - 02:00'
		},
		{
			pumpPlanData1: '02:00 - 03:00'
		},
		{
			pumpPlanData1: '03:00 - 04:00'
		},
		{
			pumpPlanData1: '04:00 - 05:00'
		},
		{
			pumpPlanData1: '05:00 - 06:00'
		},
		{
			pumpPlanData1: '06:00 - 07:00'
		},
		{
			pumpPlanData1: '07:00 - 08:00'
		},
		{
			pumpPlanData1: '08:00 - 09:00'
		},
		{
			pumpPlanData1: '09:00 - 10:00'
		},
		{
			pumpPlanData1: '10:00 - 11:00'
		},
		{
			pumpPlanData1: '11:00 - 12:00'
		},
		{
			pumpPlanData1: '12:00 - 13:00'
		},
		{
			pumpPlanData1: '13:00 - 14:00'
		},
		{
			pumpPlanData1: '14:00 - 15:00'
		},
		{
			pumpPlanData1: '15:00 - 16:00'
		},
		{
			pumpPlanData1: '16:00 - 17:00'
		},
		{
			pumpPlanData1: '17:00 - 18:00'
		},
		{
			pumpPlanData1: '18:00 - 19:00'
		},
		{
			pumpPlanData1: '19:00 - 20:00'
		},
		{
			pumpPlanData1: '20:00 - 21:00'
		},
		{
			pumpPlanData1: '21:00 - 22:00'
		},
		{
			pumpPlanData1: '22:00 - 23:00'
		},
		{
			pumpPlanData1: '23:00 - 24:00'
		}
	];
	for (i = 0; i <= pumpPlanDataMap.length; i++)
		$("#pumpPlanData").jqGrid('addRowData', i + 1, pumpPlanDataMap[i]);
	//


	//  # Caption	-- 생산관리 - 펌프 상태 조회 및 설정 A
	$("#pumpStateA").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: pumpStateAMap,
		colNames: ['펌프코드', '양정<small>(m)</small>', '유량<small>(m3/hr)</small>', '동력<small>(kW)</small>', '마력<small>(HP)</small>', 'rpm', '효율<small>(%)</small>', '펌프수신 정보', '효율분석 결과', '운영자 판단', '펌프상태\<br>최종평가'],
		colModel: [{
				name: 'pumpStateA1',
				width: 100,
				align: 'center'
			},
			{
				name: 'pumpStateA2',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateA3',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateA4',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateA5',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateA6',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateA7',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateA8',
				width: 100,
				align: 'center',
				classes: 'text-danger'
			}, // 비정상
			{
				name: 'pumpStateA9',
				width: 100,
				align: 'center',
				classes: 'text-danger'
			}, // 수선필요
			{
				name: 'pumpStateA10',
				width: 100,
				align: 'center',
				classes: 'text-danger'
			}, // 비정상
			{
				name: 'pumpStateA11',
				width: 70,
				align: 'center',
				classes: 'text-danger'
			} // 불량
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#pumpStateA").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'pumpStateA2',
				numberOfColumns: 6,
				titleText: '제원정보'
			},
			{
				startColumnName: 'pumpStateA8',
				numberOfColumns: 3,
				titleText: '상태정보'
			}
		]
	});
	// td 데이터
	var pumpStateAMap = [{
		pumpStateA1: '펌프 A',
		pumpStateA2: '10',
		pumpStateA3: '98',
		pumpStateA4: '99',
		pumpStateA5: '100',
		pumpStateA6: '100',
		pumpStateA7: '86',
		pumpStateA8: '비정상',
		pumpStateA9: '수선필요',
		pumpStateA10: '비정상',
		pumpStateA11: '불량'
	}];
	for (i = 0; i <= pumpStateAMap.length; i++)
		$("#pumpStateA").jqGrid('addRowData', i + 1, pumpStateAMap[i]);
	//


	//  # Caption	-- 생산관리 - 펌프 상태 조회 및 설정 B
	$("#pumpStateB").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: pumpStateBMap,
		colNames: ['펌프명', '동력<small>(kW)\<br>(제원정보)</small>', '양정<small>(m)</small>', '유량<small>(m3/hr)</small>', '여유율 입력(필요시)\<br><small>(1.12~1.15 범위)</small>', '정상상태<small>(제원)</small>', '분석결과', '증감', '펌프효율기준\<br>상태 판단', '운영자 판단', '최종\<br>분석일자'],
		colModel: [{
				name: 'pumpStateB1',
				width: 60,
				align: 'center'
			},
			{
				name: 'pumpStateB2',
				width: 60,
				align: 'center'
			},
			{
				name: 'pumpStateB3',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateB4',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateB5',
				width: 86,
				align: 'center'
			},
			{
				name: 'pumpStateB6',
				width: 80,
				align: 'center'
			},
			{
				name: 'pumpStateB7',
				width: 80,
				align: 'center'
			},
			{
				name: 'pumpStateB8',
				width: 80,
				align: 'center',
				classes: 'text-danger'
			},
			{
				name: 'pumpStateB9',
				width: 90,
				align: 'center',
				classes: 'text-danger'
			}, // 수선필요
			{
				name: 'pumpStateB10',
				width: 80,
				align: 'center',
				classes: 'text-danger'
			}, // 비정상
			{
				name: 'pumpStateB11',
				width: 90,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true
		//shrinkToFit: false // 가로 스크롤바
	});
	// Header 그룹핑 2
	$("#pumpStateB").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
				startColumnName: 'pumpStateB3',
				numberOfColumns: 2,
				titleText: '측정값 입력'
			},
			{
				startColumnName: 'pumpStateB6',
				numberOfColumns: 3,
				titleText: '펌프효율 분석 결과'
			}
		]
	});
	// td 데이터
	var pumpStateBMap = [{
		pumpStateB1: '펌프 A',
		pumpStateB2: '100',
		pumpStateB3: '<input type="text" class="form-control form-control-sm" placeholder="입력">',
		pumpStateB4: '<input type="text" class="form-control form-control-sm" placeholder="입력">',
		pumpStateB5: '<input type="text" class="form-control form-control-sm" placeholder="입력">',
		pumpStateB6: '85%',
		pumpStateB7: '100%<button class="ml-3 btn btn-outline-danger btn-sm">재분석</button>',
		pumpStateB8: '-15%',
		pumpStateB9: '수선필요',
		pumpStateB10: '<div class="selectbox">\<select class="form-control form-control-sm">\<option class="text-success">정상</option>\<option>비정상</option>\</select>\</div>',
		pumpStateB11: '2018-12-27'
	}];
	for (i = 0; i <= pumpStateBMap.length; i++)
		$("#pumpStateB").jqGrid('addRowData', i + 1, pumpStateBMap[i]);
	//



	//  # Caption	-- 생산관리 - 전력요금 설정
	$("#eCPriceData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: eCPriceDataMap,
		colNames: ['기본요금<small>(원)</small>', '시간대', '여름철<small>(6~8월)</small>', '여름철<small>(6~8월)</small>', '겨울철<small>(11~2월)</small>'],
		colModel: [{
				name: 'eCPriceData1',
				width: 80,
				align: 'center'
			},
			{
				name: 'eCPriceData2',
				width: 140,
				align: 'center'
			},
			{
				name: 'eCPriceData3',
				width: 150,
				align: 'center'
			},
			{
				name: 'eCPriceData4',
				width: 150,
				align: 'center'
			},
			{
				name: 'eCPriceData5',
				width: 150,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		height: '446',
		autowidth: true,
		//shrinkToFit: true
	});
	// Header 그룹핑 2
	$("#eCPriceData").jqGrid('setGroupHeaders', {
		useColSpanStyle: true,
		groupHeaders: [{
			startColumnName: 'eCPriceData6',
			numberOfColumns: 6,
			titleText: '전력량 요금 단가<small>(원/kWh)'
		}]
	});
	// td 데이터
	var eCPriceDataMap = [{
			eCPriceData1: '9,999',
			eCPriceData2: '00:00 - 01:00',
			eCPriceData3: '81.0',
			eCPriceData4: '59.2',
			eCPriceData5: '79.3'
		},
		{
			eCPriceData2: '00:00 - 01:00'
		},
		{
			eCPriceData2: '01:00 - 02:00'
		},
		{
			eCPriceData2: '02:00 - 03:00'
		},
		{
			eCPriceData2: '03:00 - 04:00'
		},
		{
			eCPriceData2: '04:00 - 05:00'
		},
		{
			eCPriceData2: '05:00 - 06:00'
		},
		{
			eCPriceData2: '06:00 - 07:00'
		},
		{
			eCPriceData2: '07:00 - 08:00'
		},
		{
			eCPriceData2: '08:00 - 09:00'
		},
		{
			eCPriceData2: '09:00 - 10:00'
		},
		{
			eCPriceData2: '10:00 - 11:00'
		},
		{
			eCPriceData2: '11:00 - 12:00'
		},
		{
			eCPriceData2: '12:00 - 13:00'
		},
		{
			eCPriceData2: '13:00 - 14:00'
		},
		{
			eCPriceData2: '14:00 - 15:00'
		},
		{
			eCPriceData2: '15:00 - 16:00'
		},
		{
			eCPriceData2: '16:00 - 17:00'
		},
		{
			eCPriceData2: '17:00 - 18:00'
		},
		{
			eCPriceData2: '18:00 - 19:00'
		},
		{
			eCPriceData2: '19:00 - 20:00'
		},
		{
			eCPriceData2: '20:00 - 21:00'
		},
		{
			eCPriceData2: '21:00 - 22:00'
		},
		{
			eCPriceData2: '22:00 - 23:00'
		},
		{
			eCPriceData2: '23:00 - 24:00'
		}
	];
	for (i = 0; i <= eCPriceDataMap.length; i++)
		$("#eCPriceData").jqGrid('addRowData', i + 1, eCPriceDataMap[i]);
	//



	//  # Caption   계수 설정
	$("#uPredmod").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: uPredmod,
		colNames: ['구분', '일', '월', '화', '수', '목', '금', '토', '평균'],
		colModel: [{
				name: 'uPredmod1',
				width: 110,
				align: 'center'
			},
			{
				name: 'uPredmod2',
				width: 60,
				align: 'center'
			},
			{
				name: 'uPredmod3',
				width: 60,
				align: 'center'
			},
			{
				name: 'uPredmod4',
				width: 60,
				align: 'center'
			},
			{
				name: 'uPredmod5',
				width: 60,
				align: 'center'
			},
			{
				name: 'uPredmod6',
				width: 60,
				align: 'center'
			},
			{
				name: 'uPredmod7',
				width: 60,
				align: 'center'
			},
			{
				name: 'uPredmod8',
				width: 60,
				align: 'center'
			},
			{
				name: 'uPredmod9',
				width: 60,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: true
	});
	// td 데이터
	var uPredmod = [{
			uPredmod1: '<input type="text" class="form-control form-control-sm" placeholder="상가,주택,공업,아파트">',
			uPredmod2: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod3: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod4: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod5: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod6: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod7: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod8: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod9: '<button type="button" class="btn btn-outline-primary">적용</button>'
		},
		{
			uPredmod1: '<input type="text" class="form-control form-control-sm" placeholder="상가,주택,공업,아파트">',
			uPredmod2: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod3: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod4: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod5: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod6: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod7: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod8: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod9: '<button type="button" class="btn btn-outline-primary">적용</button>'
		},
		{
			uPredmod1: '<input type="text" class="form-control form-control-sm" placeholder="상가,주택,공업,아파트">',
			uPredmod2: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod3: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod4: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod5: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod6: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod7: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod8: '<input type="text" class="form-control form-control-sm" placeholder="0.12345">',
			uPredmod9: '<button type="button" class="btn btn-outline-primary">적용</button>'
		}
	];
	for (i = 0; i <= uPredmod.length; i++)
		$("#uPredmod").jqGrid('addRowData', i + 1, uPredmod[i]);
	//



	//  # Caption   계수 설정
	$("#uPredblockdate").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: uPredblockdate,
		colNames: ['기준일', '기간'],
		colModel: [{
				name: 'uPredblockdate1',
				width: 80,
				align: 'center'
			},
			{
				name: 'uPredblockdate2',
				width: 80,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		autowidth: true,
		shrinkToFit: true
	});
	// td 데이터
	var uPredblockdate = [{
		uPredblockdate1: '2018-12-25',
		uPredblockdate2: '장기'
	}];
	for (i = 0; i <= uPredblockdate.length; i++)
		$("#uPredblockdate").jqGrid('addRowData', i + 1, uPredblockdate[i]);
	//



	//  # Caption   단수 제수변 추적 1
	$("#searchValueOne").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: searchValueOne,
		colNames: ['연번', '제수변 FTR_IDN'],
		colModel: [{
				name: 'searchValueOne1',
				width: 80,
				align: 'center'
			},
			{
				name: 'searchValueOne2',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		height: '120',
		autowidth: true,
		shrinkToFit: true
	});
	// td 데이터
	var searchValueOne = [{
			searchValueOne1: '1',
			searchValueOne2: '10011'
		},
		{
			searchValueOne1: '2',
			searchValueOne2: '10022'
		},
		{
			searchValueOne1: '3',
			searchValueOne2: '10033'
		},
		{
			searchValueOne1: '4',
			searchValueOne2: '10033'
		},
		{
			searchValueOne1: '5',
			searchValueOne2: '10033'
		},
		{
			searchValueOne1: '<strong>합계</strong>',
			searchValueOne2: '<strong>총 8개</strong>'
		}
	];
	for (i = 0; i <= searchValueOne.length; i++)
		$("#searchValueOne").jqGrid('addRowData', i + 1, searchValueOne[i]);
	//



	//  # Caption   단수 제수변 추적 2
	$("#searchValueTwo").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: searchValueTwo,
		colNames: ['연번', '상수관 FTR_IDN'],
		colModel: [{
				name: 'searchValueTwo1',
				width: 80,
				align: 'center'
			},
			{
				name: 'searchValueTwo2',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		height: '120',
		autowidth: true,
		shrinkToFit: true
	});
	// td 데이터
	var searchValueTwo = [{
			searchValueTwo1: '1',
			searchValueTwo2: '10011'
		},
		{
			searchValueTwo1: '2',
			searchValueTwo2: '10022'
		},
		{
			searchValueTwo1: '3',
			searchValueTwo2: '10033'
		},
		{
			searchValueTwo1: '4',
			searchValueTwo2: '10033'
		},
		{
			searchValueTwo1: '5',
			searchValueTwo2: '10033'
		},
		{
			searchValueTwo1: '<strong>합계</strong>',
			searchValueTwo2: '<strong>총 1.2km</strong>'
		}
	];
	for (i = 0; i <= searchValueTwo.length; i++)
		$("#searchValueTwo").jqGrid('addRowData', i + 1, searchValueTwo[i]);
	//


	//  # Caption   단수 제수변 추적 3
	$("#searchValueThree").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: searchValueThree,
		colNames: ['연번', '수용가번호'],
		colModel: [{
				name: 'searchValueThree1',
				width: 80,
				align: 'center'
			},
			{
				name: 'searchValueThree2',
				width: 120,
				align: 'center'
			}
		],
		viewrecords: true,
		width: 'auto',
		height: '120',
		autowidth: true,
		shrinkToFit: true
	});
	// td 데이터
	var searchValueThree = [{
			searchValueThree1: '1',
			searchValueThree2: '10011'
		},
		{
			searchValueThree1: '2',
			searchValueThree2: '10022'
		},
		{
			searchValueThree1: '3',
			searchValueThree2: '10033'
		},
		{
			searchValueThree1: '4',
			searchValueThree2: '10033'
		},
		{
			searchValueThree1: '5',
			searchValueThree2: '10033'
		},
		{
			searchValueThree1: '<strong>합계</strong>',
			searchValueThree2: '<strong>총 20개소</strong>'
		}
	];
	for (i = 0; i <= searchValueThree.length; i++)
		$("#searchValueThree").jqGrid('addRowData', i + 1, searchValueThree[i]);
	//


	//  # Caption   지점월간기준 설정
	$("#pointData").jqGrid({
		styleUI: 'Bootstrap4',
		datatype: 'local',
		data: pointData,
		colNames: ['기준월', '월간시작구분', '월간시작일', '월간종료구분', '월간종료일'],
		colModel: [{
				name: 'pointData1',
				width: 120,
				align: 'center'
			},
			{
				name: 'pointData2',
				width: 120,
				align: 'center'
			},
			{
				name: 'pointData3',
				width: 120,
				align: 'center'
			},
			{
				name: 'pointData4',
				width: 120,
				align: 'center'
			},
			{
				name: 'pointData5',
				width: 120,
				align: 'center'
			},
		],
		viewrecords: true,
		width: 'auto',
		height: '150',
		autowidth: true,
		shrinkToFit: true
	});
	// td 데이터
	var pointData = [{
			pointData1: '2019-01',
			pointData2: '전월',
			pointData3: '21',
			pointData4: '당월',
			pointData2: '30'
		},
		{
			pointData1: '2019-01',
			pointData2: '전월',
			pointData3: '21',
			pointData4: '당월',
			pointData2: '30'
		}
	];
	for (i = 0; i <= pointData.length; i++)
		$("#pointData").jqGrid('addRowData', i + 1, pointData[i]);
	//
}