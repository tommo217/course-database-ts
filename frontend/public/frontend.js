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
			alert( XHR.responseText );
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
