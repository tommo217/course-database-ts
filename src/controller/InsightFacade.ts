import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";
import {Section} from "./Section";
import {Room} from "./Room";
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
export const courseDir = "./courses/";
export const roomDir = "./rooms";
export const metaDir = "./data/meta/";
const parse5 = require("parse5");

// room related data
let table: any[] = [];
// let buildingList: any[] = []; // list of building objects
let roomData: Room[] = [];
const tableName: string = "views-table cols-5 table";

/**
 * Cache for datasets
 */
interface CoursesCache {
	[idString: string]: Section[];
}
let coursesCache: CoursesCache = {};

interface RoomsCache {
	[idString: string]: Room[];
}
let roomsCache: RoomsCache = {};
// coursesCache["course"] = sectionData;

function listStoredDatasets() {
	const dirents = fs.readdirSync(dataDir, {withFileTypes: true});
	storedIDs = dirents
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name);
	return storedIDs;
}

// function cacheContainID(id: string): boolean {
// 	if(roomsCache[id].)
// 	return false;
// }

// function  checkId(id: string) {
// 	if(id === " ") {
// 		return Promise.reject(new InsightError("Empty id"));
// 	}
// 	if (listStoredDatasets().includes(id)) {
// 		return Promise.reject(new InsightError("dataset already exists"));
// 	}
// }

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
		roomData = [];
		if(id === " " || listStoredDatasets().includes(id)) {
			return Promise.reject(new InsightError("Invalid id"));
		}
		return new Promise(function (resolve, reject) {
			// load zip, check zip validity
			zip.loadAsync(content, {base64: true}).then(function(ZipObj: any) {
				if(kind === InsightDatasetKind.Courses) {
					if(zip.folder(/courses/).length <= 0){
						return reject(new InsightError("No courses folder."));
					}
					// open courses folder and parse info
					ZipObj.folder("courses")?.forEach((relativePath: string, file: any) => {
						courseString = file.async("string");
						courseData.push(courseString);
					});
					Promise.all(courseData).then((array)=> {
						numRows = utils.parseCourse(array, id, storedIDs, sectionData);
						if(numRows > 0) {
							// store in cache
							coursesCache[id] = sectionData;
							// write to disc
							// numRows = sectionData.length;
							utils.writeToDisc(id, kind, numRows, sectionData);
							// resolve with list of stored datasets
							return resolve(Object.keys(coursesCache));
						} else {
							return reject(new InsightError("No valid sections."));
						}
					});
				} else if (kind === InsightDatasetKind.Rooms) {
					if(zip.folder(/rooms/).length <= 0){
						return reject(new InsightError("No rooms folder."));
					}
					// C2 implementation
					// zip.file("index.htm")
					ZipObj.folder("rooms").file("index.htm").async("string").then(async (indexString: string) => {
						// utils.addRoom(ZipObj, indexString, roomData);
						let buildingList = utils.getBuilding(indexString);
						// numRows = utils.loadRoom(ZipObj, await buildingList, roomData);
						await utils.loadRoom(ZipObj, await buildingList, roomData);
						if(roomData.length > 0) {
							roomsCache[id] = roomData;
							utils.writeToDisc(id, kind, roomData.length, roomData);
							return resolve(Object.keys(roomsCache));
						} else {
							return reject(new InsightError("No valid room."));
						}
					});
				} else {
					return Promise.reject("Unknown dataset kind.");
				}
			}).catch( (err)=> {
				return reject(new InsightError(err));
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
					let dataID = datasetMeta["datasetID"];
					let dataKind = datasetMeta["kind"];
					let dataNumRows = datasetMeta["numRow"];
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
	if (content.indexOf("[") > 0) {
		content = content.slice(content.indexOf("["));
	}
	while (content.indexOf("{") > -1) {
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
		console.warn("Error in reading section data: " + secStr);
		console.log(err);
	}
}

