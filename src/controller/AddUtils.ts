import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Section} from "./Section";

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

	public parseCourse(array: string[], ID: string, storedIDs: string[], sectionData: Section[]): number{
		for (const element of array) { // element is the text string of the course file.
			let course: any;
			try{
				course = JSON.parse(element);// course is the content in each course file
			} catch (e) {
				console.log(e);
			}
			let sectionsArr = course["result"];// an array holding all the sections in this course
			if(sectionsArr.length > 0) {// has section data in this course file
				// check all sections, extract query keys and put into Section object, skip invalid sections
				this.createSectionObjects(sectionsArr, sectionData);
			}
				// return sectionData.length;
		}
		return sectionData.length;
	}

	public async writeToDisc(datasetID: string, kind: InsightDatasetKind, numRow: number,  sectionData: Section[]) {
		let datasetObj = JSON.stringify({datasetID, kind, numRow, sectionData});
		let metaData = JSON.stringify({datasetID, kind, numRow});
		try {
			await fs.outputFile((dataDir + datasetID), datasetObj);
			await fs.outputFile((metaDir + datasetID + "_meta"), metaData);
		} catch (e) {
			// return Promise.reject(new InsightError("Write to disk error"));
			console.log(e);
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
