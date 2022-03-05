import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";
import {parseQuery, Query} from "../model/Query";
import * as fs from "fs";
import {Section} from "./Section";

export const dataDir = "./data/";

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
		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
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
		// return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}


/**
 * Read the file in query to search for query result
 * if result size exceeds 5000, throw error.
 */
function queryForResult(q: Query): InsightResult[]{
	const resultLimit = 5000;
	let results: InsightResult[] = [];

	const filePath = dataDir + q.options.idString + ".json";
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

