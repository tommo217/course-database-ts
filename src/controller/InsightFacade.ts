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
import {AddUtils} from "./AddUtils";

let zip = new JSZip();
let utils = new AddUtils();
let courseString: string;// hold string data of one course
let courseData: string[] = [];// array containing each course
let sectionData: Section[] = [];// array of the valid section objects
let numRows: number = 0;
let storedIDs: string[] = [];// array of all the stored dataset IDs
export const dataDir = "./data/";
export const courseDir = "./courses";
export const roomDir = "./rooms";
const metaDir = "./data/meta/";

interface CoursesCache {
	[idString: string]: Section[];
}
let coursesCache: CoursesCache = {};

interface RoomsCache {
	[idString: string]: any[];
}
let roomsCache: RoomsCache = {};
// coursesCache["course"] = sectionData;


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

// async function parseInfo(dataArr: string[], dataID: string, dataKind: InsightDatasetKind): Promise<string[]> {
//
// }

function listStoredDatasets() {
	const dirents = fs.readdirSync(dataDir, {withFileTypes: true});
	storedIDs = dirents
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);
	return storedIDs;
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
		sectionData = [];
		courseData = [];
		if(id === " ") {
			return Promise.reject(new InsightError("Empty id"));
		}
		if (listStoredDatasets().includes(id)) {
			return Promise.reject(new InsightError("dataset already exists"));
		}
		return new Promise(function (resolve, reject) {
			// load zip, check zip validity
			zip.loadAsync(content, {base64: true}).then(function(ZipObj: any) {
				if(kind === InsightDatasetKind.Courses) {
					fs.access(courseDir, function(err){
						if(err) {
							return reject(new InsightError("No courses folder."));
						} else {
							// open courses folder and parse info
							ZipObj.folder("courses")?.forEach(async (relativePath: string, file: any) => {
								courseString = file.async("string");
								courseData.push(courseString);
							});
							Promise.all(courseData).then((array)=>{
								let parseSuccess = utils.parseCourse(array, id, storedIDs, sectionData);
								if(parseSuccess) {
									// store in cache
									coursesCache[id] = sectionData;
									// write to disc
									numRows = sectionData.length;
									utils.writeToDisc(id, kind, numRows, sectionData);
									// resolve with list of stored datasets
									return resolve;
								} else {
									return reject(new InsightError("No valid sections."));
								}
							});
						}
					});
				} else if (kind === InsightDatasetKind.Rooms) {
					fs.access(roomDir, function(err){
						if(err) {
							return reject(new InsightError("No courses folder."));
						}
					});
				} else {
					return Promise.reject("Unknown dataset kind.");
				}

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
				return resolve(id);
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

