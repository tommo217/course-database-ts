import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

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
		console.log(typeof query);
		let queryObj;
		console.log(typeof query);
		if (typeof query === "string") {
			let queryStr = query as string;
			queryObj = JSON.parse(queryStr);
		} else {
			queryObj = query;
		}


		return Promise.resolve([{test:"test"}]);
		// return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
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
