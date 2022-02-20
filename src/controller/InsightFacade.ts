import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import {Section} from "./Section";
import * as fs from "fs-extra";
import JSZip from "jszip";

let zip = new JSZip();
let courseString: string;// hold string data of one course
let courseData: string[] = [];// array containing each course
let sectionData: Section[] = [];// array of the valid section objects
let numRows: number = 0;
let storedIDs: string[] = [];// array of all the stored dataset IDs

function createSectionObjects(sectionArr: any) {
	for(const sect of sectionArr) {
		let avg: number = sect["Avg"];
		let pass: number = sect["Pass"];
		let fail: number = sect["Fail"];
		let audit: number = sect["Audit"];
		let year: number = sect["Section"] === "overall" ? 1900 : Number(sect["Year"]);
		let dept: string = sect["Subject"];
		let cId: string = sect["Course"]; // course ID
		let prof: string = sect["Professor"];// this is instructor in Section obj
		let title: string = sect["Title"];
		let uid: string = String(sect["id"]);// this is uuid in Section obj
		if(avg === undefined || pass === undefined || fail === undefined || audit === undefined || year === undefined ||
			dept === undefined || cId === undefined || prof === undefined || title === undefined || uid === undefined) {
			continue;
		}
		let thisSection: Section =
			new Section(avg, pass, fail, audit, year,dept, cId, prof, title, uid);
		sectionData.push(thisSection);
	}
}

// function async getDatasetIDs(): string[] {
// 	/* 1. read ./data dir and get all json files from disk
// 	*  2. parse every json into array and store in storedDatasets
// 	*  3. resolve promise
// 	* */
// 	let fileArr: string[];
//
// 	return fileArr;
// 	// fs.readdir("./data/", (err, files) => {
// 	// 	res = files;
// 	// });
// 	// return res;
// }

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		storedIDs = fs.readdirSync("./data");
		if (storedIDs.includes(id)) {
			return Promise.reject("Duplicate id");
		}
		if(id === " ") {
			return Promise.reject("Empty id");
		}
		if(kind !== InsightDatasetKind.Courses) {
			return Promise.reject("Not course data");
		}
		return new Promise(function (resolve, reject) {
			zip.loadAsync(content, {base64: true}).then(function(ZipObj: any) {
				ZipObj.folder("courses")?.forEach(async (relativePath: string, file: any) => {
					courseString = file.async("string");
					courseData.push(courseString);
				});
				Promise.all(courseData).then((array)=>{
					for (const element of array) { // element is the text string of the course file.
						let course: any;
						try{
							course = JSON.parse(element);// course is the content in each course file
						} catch (e) {
							return reject(new InsightError("Error in parse course file."));
						}
						let sectionsArr = course["result"];// an array holding all the sections in this course
						if(sectionsArr.length > 0) {// has section data in this course file
							// check all sections, extract query keys and put into Section object, skip invalid sections
							createSectionObjects(sectionsArr);
						}
					}
					numRows = sectionData.length;
					if(numRows === 0) {
						return reject( new InsightError("No valid section.")); // zero valid sections found in all course files, return InsightError.
					} else {
						// save to disk
						let datasetObj = JSON.stringify({id, kind, numRows, sectionData});
						fs.outputFile( ("./data/" + id + ".json"), datasetObj).catch((err) => {
							return reject(new InsightError("Write to disk error."));
						});
					}
				});
			});
			storedIDs = fs.readdirSync("./data");
			return resolve(storedIDs);
		});
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		// console.log(typeof query);
		// let queryObj;
		// console.log(typeof query);
		// if (typeof query === "string") {
		// 	let queryStr = query as string;
		// 	queryObj = JSON.parse(queryStr);
		// } else {
		// 	queryObj = query;
		// }
		//

		return Promise.resolve([{test:"test"}]);
		// return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {

		return new Promise<InsightDataset[]>(function(resolve, reject) {
			// --------------
			// fs.readdir("./data", (err, files) => {
			// 	files.forEach((file) => {
			// 		let dataset: string;
			// 		try{
			// 			dataset = JSON.parse(file);
			// 		} catch (e) {
			// 			return reject(new InsightError("Error in reading stored dataset."));
			// 		}
			// 		storedDatasets.push(dataset);
			// 	});
			// });
			// --------------
		});
		// return Promise.reject("Not implemented.");
		// return Promise.resolve([
		// 	{
		// 		id: "courses-2",
		// 		kind: InsightDatasetKind.Courses,
		// 		numRows: 64612,
		// 	},
		// 	{
		// 		id: "courses",
		// 		kind: InsightDatasetKind.Courses,
		// 		numRows: 64612,
		// 	}
		// ]);
	}
}


/**
 * TODO: Delete/Comment out! test script for performQuery
 */
let facade: InsightFacade = new InsightFacade();
let query = {
	WHERE: {
		GT: {courses_avg: 97}
	},
	OPTIONS: {
		COLUMNS: ["courses_dept","courses_avg"],
		ORDER: "courses_avg"
	}
};


facade.performQuery(JSON.stringify(query));
// facade.performQuery(query);
