import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Section} from "./Section";
import {CoursesCache}  from"./CoursesCache";
import {RoomsCache} from "./RoomCache";


let numRows: number;
let dataDir = "./data/";
let metaDir = "./meta/";
// let storedIDs: string[] = [];// array of all the stored dataset IDs

export class AddUtils {
	constructor() {
		numRows = 0;
	}

	public createSectionObjects(sectionArr: any, sectionData: Section[]) {
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

			if(avg === undefined || pass === undefined || fail === undefined
				|| audit === undefined || year === undefined ||
				dept === undefined || cId === undefined || prof === undefined
				|| title === undefined || uid === undefined) {
				continue;
			}
			let thisSection: Section =
				new Section(avg, pass, fail, audit, year,dept, cId, prof, title, uid);
			sectionData.push(thisSection);
		}
	}

	public parseCourse(Arr: string[], ID: string, storedIDs: string[], sectionData: Section[]): boolean {
		for (const element of Arr) { // element is the text string of the course file.
			let course: any;
			try{
				course = JSON.parse(element);// course is the content in each course file
			} catch (e) {
				console.log(e);
				return false; // Error in parse course file.
			}
			let sectionsArr = course["result"];// an array holding all the sections in this course
			if(sectionsArr.length > 0) {// has section data in this course file
				// check all sections, extract query keys and put into Section object, skip invalid sections
				this.createSectionObjects(sectionsArr, sectionData);
			}
		}
		numRows = sectionData.length;
		if(numRows === 0) {
			// zero valid sections found in all course files, return InsightError.
			return false;
		} else {
			// let kind = InsightDatasetKind.Courses;
			// save to disk TODO: move to writeTODisc function
			//
			// write to cache
			// write to disc
			// this.writeToDisc(ID, datasetObj, metaData);

			// storedIDs = listStoredDatasets();
			return true;
		}
	}

	public async writeToDisc(datasetID: string, kind: InsightDatasetKind, numRow: number,  sectionData: Section[]) {
		let datasetObj = JSON.stringify({datasetID, kind, numRow, sectionData});
		let metaData = JSON.stringify({datasetID, kind, numRow});
		try {
			await fs.outputFile((dataDir + datasetID), datasetObj);
			await fs.outputFile((metaDir + datasetID + "_meta"), metaData);
		} catch (e) {
			return Promise.reject(new InsightError("Write to disk error"));
		}
	}
}


// ZipObj.folder("courses")?.forEach(async (relativePath: string, file: any) => {
// 	courseString = file.async("string");
// 	courseData.push(courseString);
// });
// Promise.all(courseData).then((array)=>{
// 	parseInfo(array, id, kind).then((res) => {
// 		return resolve(res);
// 	});
// });
