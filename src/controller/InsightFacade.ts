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
import {readdir} from "fs";

let zip = new JSZip();
let courseString: string;// hold string data of one course
let courseData: string[] = [];// array containing each course
let sectionData: Section[] = [];// array of the valid section objects
let numRows: number = 0;
let storedIDs: string[] = [];// array of all the stored dataset IDs
let dataDir = "./data/";
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
				// console.log("Type of query: ", typeof query);
				if (typeof query === "string") {
					let queryStr = query as string;
					queryObj = JSON.parse(queryStr);
				} else {
					queryObj = query;
				}
				// let q: Query = parseQuery(queryObj);
				// console.log(q);
				resolve([{test: "no syntax error"}]);
			} catch (err) {
				if (err instanceof Error) {
					reject(new InsightError(err.message));
				} else {
					reject(new InsightError());
				}
			}
		});

		// return Promise.reject("Not implemented.");
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
