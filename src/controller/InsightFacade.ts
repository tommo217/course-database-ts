import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";
import {Section} from "./Section";
import {parseQuery, Query} from "../model/Query";
import * as fs from "fs-extra";
import JSZip from "jszip";
import {readdir} from "fs";

let zip = new JSZip();
let courseString: string;// hold string data of one course
let courseData: string[] = [];// array containing each course
let sectionData: Section[] = [];// array of the valid section objects
let numRows: number = 0;
let storedIDs: string[] = [];// array of all the stored dataset IDs
export const dataDir = "./data/";
let metaDir = "./data/meta/";

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

async function parseInfo(dataArr: string[], dataID: string, dataKind: InsightDatasetKind): Promise<string[]> {
	for (const element of dataArr) { // element is the text string of the course file.
		let course: any;
		try{
			course = JSON.parse(element);// course is the content in each course file
		} catch (e) {
			return Promise.reject(new InsightError("Error in parse course file")); // Error in parse course file.
		}
		let sectionsArr = course["result"];// an array holding all the sections in this course
		if(sectionsArr.length > 0) {// has section data in this course file
				// check all sections, extract query keys and put into Section object, skip invalid sections
			createSectionObjects(sectionsArr);
		}
	}
	numRows = sectionData.length;
	if(numRows === 0) {
		// zero valid sections found in all course files, return InsightError.
		return Promise.reject(new InsightError("No valid section"));
	} else {
		// save to disk
		let datasetObj = JSON.stringify({dataID, dataKind, numRows, sectionData});
		let metaData = JSON.stringify({dataID, dataKind, numRows});

		try {
			await fs.outputFile((dataDir + dataID), datasetObj);
			await fs.outputFile((metaDir + dataID + "_meta"), metaData);
		} catch (e) {
			return Promise.reject(new InsightError("Write to disk error"));
		}
		const dirents = fs.readdirSync(dataDir, {withFileTypes: true});
		storedIDs = dirents
			.filter((entry) => entry.isFile())
			.map((entry) => entry.name);
		return Promise.resolve(storedIDs);
	}
}

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir);
		}
		if (!fs.existsSync(metaDir)) {
			fs.mkdirSync(metaDir);
		}
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if(id === " ") {
			return Promise.reject("Empty id");
		}
		if(kind !== InsightDatasetKind.Courses) {
			return Promise.reject("Not course data");
		}

		return new Promise(function (resolve, reject) {
			// load zip, check zip validity
			zip.loadAsync(content, {base64: true}).then(function(ZipObj: any) {
				// check courses folder exists using fs.promises.access(file, fs.constants.F_OK)
				fs.access(dataDir, function(err){
					if(err) {
						return reject(new InsightError("No courses folder."));
					}
				});
				// 保留以上在addDataset， 下面handling放helper里
				// handle course data
				// handle room data
				// use number to reflect whether helper successed or failed.
				ZipObj.folder("courses")?.forEach(async (relativePath: string, file: any) => {
					courseString = file.async("string");
					courseData.push(courseString);
				});
				Promise.all(courseData).then((array)=>{
					parseInfo(array, id, kind).then((res) => {
						return resolve(res);
					});
				});
			}).catch( ()=> {
				return reject(new InsightError("Not valid zip"));
			});
		});
	}

	public removeDataset(id: string): Promise<string> {
		return new Promise<string>(function (resolve, reject){
			let dataPath = dataDir + id;
			let metaPath = metaDir + id + "_meta";
			if(fs.existsSync(dataPath)) {
				try{
					fs.unlinkSync(dataPath);
					fs.unlinkSync(metaPath);
				}catch (err) {
					return reject(new InsightError("Error in deleting file."));
				}
				return resolve("Removed " + id);
			} else {
				return reject(new InsightError("ID does not exist."));
			}
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise<InsightResult[]>( (resolve, reject) => {
			try {
				let queryObj;
				if (typeof query === "string") {
					let queryStr = query as string;
					queryObj = JSON.parse(queryStr);
				} else {
					queryObj = query;
				}
				const q: Query = parseQuery(queryObj);
				const results = queryForResult(q);
				resolve(results);
			} catch (err) {
				if (err instanceof ResultTooLargeError) {
					reject(err);
				} else if (err instanceof Error) {
					reject(new InsightError(err.message));
				} else {
					reject(new InsightError("Unknown error"));
				}
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return new Promise<InsightDataset[]>(function(resolve, reject) {
			let datasetArr: InsightDataset[] = [];
			fs.readdir(metaDir, (err, files) => {
				files.forEach((file) => {
					let datasetMeta; // metadata of one dataset
					// let datasetArr: InsightDataset[] = [];
					try{
						const metaContent = fs.readFileSync(metaDir + file).toString("utf-8");
						datasetMeta = JSON.parse(metaContent);
					} catch (e) {
						return reject(new InsightError("Error in reading stored metadata: " + metaDir + file));
					}
					let dataID = datasetMeta["dataID"];
					let dataKind = datasetMeta["dataKind"];
					let dataNumRows = datasetMeta["numRows"];
					// a struct to store InsightDataset obj
					let datasetObj: any = {
						id: dataID,
						kind: dataKind,
						numRows: dataNumRows
					};
					let datasetInstance = datasetObj as InsightDataset;
					// let datasetObj = JSON.stringify({dataID, dataKind, dataNumRows});
					datasetArr.push(datasetInstance);
				});
				return resolve(datasetArr);
			});
		});
	}
}

/**
 * Read the file in query to search for query result
 * if result size exceeds 5000, throw error.
 */
function queryForResult(q: Query): InsightResult[]{
	const resultLimit = 5000;
	let results: InsightResult[] = [];

	const filePath = dataDir + q.options.idString;
	const content: string = fs.readFileSync(filePath, "utf-8");
	const secStrings = sliceIntoObjects(content);

	// process all sections
	secStrings.map((secStr) => {
		processSection(secStr, q, results);
	});

	// TODO optimise
	if (results.length > resultLimit) {
		throw new ResultTooLargeError("query result exceeds " + resultLimit);
	}

	q.options.sortRsults(results);
	return results;
}

/**
 * Helper, slice content into string array of JSON objects
 */
function sliceIntoObjects(content: string): string[] {
	let secStrings: string[] = [];
	while(content.indexOf("{") > -1) {
		const objStart = content.indexOf("{");
		const objEnd = content.indexOf("}");
		if (objStart < objEnd) {
			let next = content.slice(objStart, objEnd + 1);
			content = content.slice(objEnd + 1); // slice off this object
			secStrings.push(next);
		} else {
			throw new Error("Incorrect dataset format");
		}
	}
	return secStrings;
}

/**
 * Filter given section based on query options
 */
function processSection(secStr: string, query: Query, results: InsightResult[]) {
	try {
		const sec: Section = JSON.parse(secStr);
		if (query.body.evaluateEntry(sec)) {
			let res = query.options.transformSections(sec);
			results.push(res);
		}
	} catch (err) {
		console.warn("Invalid entry in database: " + secStr);
	}
}

