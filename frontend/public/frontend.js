// document.getElementById("click-me-button").addEventListener("click", handleClickMe);
//
// function handleClickMe() {
// 	alert("Button Clicked!");
// }

function sendData(form, formNum) {
	const XHR = new XMLHttpRequest();

	// Bind the FormData object and the form element
	const FD = new FormData( form );
	let query = "";

	if (formNum === 1) {
		query = formToQuery1(FD);
	}

	console.log(query)

	// Define what happens on successful data submission
	XHR.addEventListener( "load", function(event) {
		if (XHR.status === 200) {
			console.log(XHR.responseText);
			printResult(XHR.responseText, tableWrapper1);
		} else {
			alert("API returned error: " + XHR.responseText);
		}
	});

	// Define what happens in case of error
	XHR.addEventListener( "error", function( event ) {
		alert( 'Network Error!' );
	} );

	// Set up our request
	XHR.open( "POST", "http://localhost:4321/query" );
	XHR.setRequestHeader("Content-Type","application/json")
	// The data sent is what the user provided in the form
	XHR.send( query );
}

// Access the form element...
const form1 = document.getElementById( "query1" );

// ...and take over its submit event.
form1.addEventListener( "submit", function ( event ) {
	event.preventDefault();
	sendData(form1, 1);
} );

// parse formData as insightFacade query
function formToQuery1(formData) {
	let sectionDept = formData.get('sectionDept');
	let sectionId = formData.get('sectionId').toString();
	let yearGt = Number(formData.get('yearGt'));
	let yearLt = Number(formData.get('yearLt'));

	let query = {
		"WHERE": {
			"AND": [
				{
					"IS": { "courses_dept": sectionDept}
				},
				{
					"IS":{ "courses_id": sectionId}
				},
				{
					"GT": { "courses_year": yearGt}
				},
				{
					"LT": { "courses_year": yearLt}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"courses_dept",
				"courses_id",
				"overallAvg"
			]
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"courses_dept",
				"courses_id"
			],
			"APPLY": [
				{ "overallAvg": { "AVG": "courses_avg"} }
			]
		}
	}

	return JSON.stringify(query);
}

const tableWrapper1 = document.getElementById("table-wrapper-1")

function clearResponseTable() {
	const table = document.getElementById("responseTable");
	if (table !== null) {
		table.remove();
	}
	const text = document.getElementById("responseText");
	if (text !== null) {
		text.remove();
	}
}

function printResult(responseText, element) {
	clearResponseTable();

	let response = JSON.parse(responseText);
	let resData = response['result'];

	// indicate empty result
	if (resData.length === 0) {
		let responseTxt = document.createElement('label');
		responseTxt.appendChild(document.createElement('br'));
		responseTxt.append(document.createTextNode("Empty Result!"));
		responseTxt.setAttribute('id', 'responseText');
		responseTxt.style.color = "#8D8D8D";
		element.appendChild(responseTxt);
		return;
	}

	let table = document.createElement('table');
	table.setAttribute('id', 'responseTable')

	// create label row
	let labelRow = document.createElement('tr');
	for (let label in resData[0]) {
		let td = document.createElement('td');
		let text = document.createTextNode(label);
		td.appendChild(text);
		labelRow.appendChild(td);
	}
	table.appendChild(labelRow)

	// add data rows
	for (let i = 0; i < resData.length; i++) {
		let row = document.createElement('tr');
		for (let label in resData[i]) {
			let td = document.createElement('td');
			let text = document.createTextNode(resData[i][label]);
			td.appendChild(text);
			row.appendChild(td);
		}
		table.appendChild(row)
	}

	// let div = document.getElementById("table-wrapper-1") // TODO: make dynamic
	element.appendChild(table)
}
