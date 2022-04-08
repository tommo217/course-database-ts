import {Query} from "../model/Query";
import {InsightDatasetKind, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Indexable, Section} from "./Section";
import {Room} from "./Room";
import {dataDir, metaDir} from "./InsightFacade";


function isSections(entries: Room[] | Section[]): entries is Section[] {
	return entries[0] instanceof Section;
}

function readDatasetFromDisk(idString: string): Room[] | Section[] {
	const content: string = fs.readFileSync(dataDir + idString, "utf-8");
	const objStrings: string[] = sliceIntoObjects(content);

	// parse depending on kind of dataset
	if (readDatassetKind(idString) === InsightDatasetKind.Courses) {
		return objStrings.map((secStr) => {
			return JSON.parse(secStr) as Section;
		});
	} else {
		return objStrings.map((roomStr) => {
			return JSON.parse(roomStr) as Room;
		});
	}
}

function readDatassetKind(idString: string) {
	const content = fs.readFileSync(metaDir + idString + "_meta", "utf-8");
	const kind = JSON.parse(content)["kind"];
	if (kind === InsightDatasetKind.Courses.toString()) {
		return InsightDatasetKind.Courses;
	} else {
		return InsightDatasetKind.Rooms;
	}
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
 * Filter given entry based on query options
 */
function processRow(entry: Indexable, query: Query, results: InsightResult[]) {
	if (query.body.evaluateEntry(entry)) {
		if (!query.options.haveTransform) {
				// simple re-cast of columns
			let res = query.options.transformToResult(entry);
			res = query.options.filterColumns(res, []);
			results.push(res);
		} else {
			results.push(entry as InsightResult);
		}
	}

}


export{isSections, readDatasetFromDisk, sliceIntoObjects, processRow};
