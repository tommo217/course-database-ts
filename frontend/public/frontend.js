const tableWrapper1 = document.getElementById("table-wrapper-1")
const tableWrapper2 = document.getElementById("table-wrapper-2")

function sendData(form, formNum) {
	const XHR = new XMLHttpRequest();

	// Bind the FormData object and the form element
	let FD = new FormData( form );
	let query = "";

	if (formNum === 1) {
		query = formToQuery1(FD);
	}

	if (formNum === 2) {
		query = formToQuery2(FD);
	}

	if (query['error'] === true) {
		return;
	}

	let resultTable = formNum === 1 ? tableWrapper1 : tableWrapper2;

	console.log(query)

	// Define what happens on successful data submission
	XHR.addEventListener( "load", function(event) {
		if (XHR.status === 200) {
			console.log(XHR.responseText);
			printResult(XHR.responseText, resultTable);
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
let form1 = document.getElementById( "query1" );

// ...and take over its submit event.
form1.addEventListener( "submit", function ( event ) {
	event.preventDefault();
	clearWarnings();
	clearResponseTable();
	sendData(form1, 1);
} );

let form2 = document.getElementById("query2");

form2.addEventListener( "submit", function ( event ) {
	event.preventDefault();
	clearWarnings();
	clearResponseTable();
	sendData(form2, 2);
} );

// parse formData as insightFacade query
function formToQuery1(formData) {
	let sectionDept = formData.get('sectionDept');
	let sectionId = String(formData.get('sectionId')).padStart(3, '0');
	let yearGt = Number(formData.get('yearGt'));
	let yearLt = Number(formData.get('yearLt'));

	if (yearGt >= yearLt) {
		invalidYearsWarning();
		return {"error": true}
	}

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

let trackedMinSeats = 0; // TODO: find better solution
const furnitureList = document.getElementById("furniture-list");
function formToQuery2(formData) {
 	let query = {}
	let minSeats = trackedMinSeats;
	let option = formData.get('furniture');

	let [optionId, furniturePref] = optionToQueryComponent(option);

	console.log("DEBUG MIN SEATS: "+ minSeats)
	console.log("DEBUG option: " + option);
	console.log("DEBUG OptionId: " + optionId);

	if (optionId < 0){
		outOfRangeWarning();
		return {"error": true}
	}

	if (optionId !== 0) {
		query = {
			"WHERE": {
				"AND": [ furniturePref,
						{ "GT": { "rooms_seats": minSeats } }
					]
			},
			"OPTIONS": {
				"COLUMNS": [
					"rooms_fullname",
					"rooms_number",
					"rooms_seats",
					"rooms_furniture"
				],
				"ORDER": "rooms_seats"
			}
		}
	} else {
		query = {
			"WHERE": {
				"AND": [
					{ "GT": { "rooms_seats": minSeats } }
				]
			},
			"OPTIONS": {
				"COLUMNS": [
					"rooms_fullname",
					"rooms_number",
					"rooms_seats",
					"rooms_furniture"
				],
				"ORDER": "rooms_seats"
			}
		}
	}

	return JSON.stringify(query);
}

function outOfRangeWarning() {
	let inputElem = document.getElementById('input-warning');

	let warningTxt = document.createElement('label');
	warningTxt.append(document.createTextNode("Invalid Furniture! Choose from the drop-down"));
	warningTxt.setAttribute('id', 'warningTxt');
	warningTxt.style.color = "#DC143C";
	inputElem.appendChild(warningTxt);
}

function invalidYearsWarning() {
	let inputElem = document.getElementById('year-warning');

	let warningTxt = document.createElement('label');
	warningTxt.append(document.createTextNode("'From Year' must be smaller than 'To Year'."));
	warningTxt.setAttribute('id', 'warningTxt');
	warningTxt.style.color = "#DC143C";
	inputElem.appendChild(warningTxt);
}

function optionToQueryComponent(option) {
	let queryComponent = {};
	let optionId = -1;

	for (let i = 0; i < furnitureList.options.length; i++) {
		if (furnitureList.options[i].value === option) {
			optionId = i;
		}
	}

	switch (optionId) {
		case 0:
			break;
		case 1:
			queryComponent = {"OR": [
				{ "IS": { "rooms_furniture": "Classroom-Movable Tables & Chairs"} },
				{ "IS": { "rooms_furniture": "Classroom-Moveable Tables & Chairs"} }
				] }
			break;
		case 2:
			queryComponent = {"OR": [
					{ "IS": { "rooms_furniture": "Classroom-Fixed Tables/Fixed Chairs"} }
				] }
			break;
		case 3:
			queryComponent = {"OR": [
					{ "IS": { "rooms_furniture": "Classroom-Fixed Tables/Movable Chairs"} },
					{ "IS": { "rooms_furniture": "Classroom-Fixed Tables/Moveable Chairs"} }
				] }
			break;
		case 4:
			queryComponent = {"OR": [
					{ "IS": { "rooms_furniture": "Classroom-Hybrid Furniture"} }
				] }
			break;
		case 5:
			queryComponent = {"OR": [
					{ "IS": { "rooms_furniture": "Classroom-Learn Lab"} }
				] }
			break;
	}

	return [optionId, queryComponent];
}


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

function clearWarnings() {
	const warning = document.getElementById("warningTxt");
	if (warning !== null) {
		warning.remove();
	}
}

function printResult(responseText, element) {

	let response = JSON.parse(responseText);
	let resData = response['result'];

	// indicate empty result
	if (resData.length === 0) {
		let responseTxt = document.createElement('label');
		responseTxt.appendChild(document.createElement('br'));
		let errorTxt = "No matches found. "

		if (element.id === "table-wrapper-1") {
			errorTxt = "No matches found. The course does not exist in the year range provided."
		} else {
			errorTxt = "No matches found. Try lower the minimum seats or change furniture types. "
		}
		responseTxt.append(document.createTextNode(errorTxt));
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


// --------- Interactive Elements In Query 2 --------------

var range = document.getElementById('minSeatsRange');
var field = document.getElementById('minSeatsNum');

range.addEventListener('input', function (e) {
	field.setAttribute('value', e.target.value)
	field.value = e.target.value;
	trackedMinSeats = e.target.value;
});
field.addEventListener('input', function (e) {
	range.setAttribute('value', e.target.value)
	range.value = e.target.value;
	trackedMinSeats = e.target.value;
});

var furnitureInput = document.getElementById('furniture');

furnitureInput.addEventListener('input', (e) => {
	clearWarnings();
})
