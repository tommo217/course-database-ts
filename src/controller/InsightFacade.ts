import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import {parseQuery, Query} from "./Query";

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
				// console.log("Type of query: ", typeof query);
				if (typeof query === "string") {
					let queryStr = query as string;
					queryObj = JSON.parse(queryStr);
				} else {
					queryObj = query;
				}
				let q: Query = parseQuery(queryObj);
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
// let facade: InsightFacade = new InsightFacade();
// let query = {
// 	WHERE: {
// 		// GT: {courses_avg: 97}
// 		IS:{courses_dept:"math"}
// 	},
// 	OPTIONS: {
// 		COLUMNS: ["courses_dept","courses_avg"],
// 		ORDER: "courses_avg"
// 	}
// };
//
// let queryC = {
// 	WHERE: {
// 		OR: [
// 			{
// 				AND: [
// 					{
// 						GT: {
// 							courses_avg: 90
// 						}
// 					},
// 					{
// 						IS: {
// 							courses_dept: "adhe"
// 						}
// 					}
// 				]
// 			},
// 			{
// 				EQ: {
// 					courses_avg: 95
// 				}
// 			}
// 		]
// 	},
// 	OPTIONS: {
// 		COLUMNS: [
// 			"courses_dept",
// 			"courses_id",
// 			"courses_avg"
// 		],
// 		ORDER: "courses_avg"
// 	}
// };
//
// let queryInvalid = {
// 	WHERE: {
// 		// GT: {courses_avg: 97}
// 		IS:{courses_dept:"math"}
// 	}
// };
//
//
// // facade.performQuery(JSON.stringify(query));
// // let q: Query = parseQuery(queryInvalid);

