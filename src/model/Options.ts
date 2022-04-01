/**
 * 'Options' portion of the query object
 */

import {parseKey, Query} from "./Query";
import {Indexable, Section} from "../controller/Section";
import {InsightResult} from "../controller/IInsightFacade";
import {mFields, sFields} from "./Filter";

const directions = ["UP", "DOWN"];
export class Options {
	public idString: string; // specifies database
	public columns: string[]; // name of attributes, without database name
	public orderKeys: string[]; // name of attribute to order by, without database name
	public direction: string;
	public haveTransform: boolean; // flag for if parent query has transform field

	constructor() {
		this.idString = "";
		this.columns = [];
		this.orderKeys = [];
		this.direction = directions[0];
		this.haveTransform = false;
	}

	public deserialize(input: any, haveTransform: boolean) {
		this.haveTransform = haveTransform;

		if (input.COLUMNS !== undefined) {
			for (let i in input.COLUMNS) {
				let field = this.verifyAndReadKey(input.COLUMNS[i], mFields.concat(sFields));
				this.columns.push(field);
			}

			// single string or object containing "dir" and "keys"
			if (input.ORDER !== undefined) {
				this.readOrderKeys(input.ORDER);
			}

			return;
		}
		throw new Error("Syntax error: missing COLUMNS or ORDER");
	}

	// parses order section and read orderKeys
	private readOrderKeys(orderObj: any) {
		if (typeof orderObj === "string") { // single string
			this.orderKeys.push(this.verifyAndReadKey(orderObj, this.columns));
			return;
		} else if (orderObj.dir !== undefined && directions.includes(orderObj.dir)) { // object
			this.direction = orderObj.dir;
			if (orderObj.keys instanceof Array) {
				orderObj.keys.forEach((key: string) => {
					this.orderKeys.push(this.verifyAndReadKey(key, this.columns));
				});
			}
			return;
		} else {
			throw new Error("Syntax error: invalid format in ORDER");
		}
	}

	/**
	 * Given an acceptable range of fields, verify column key for semantic error & return field contained in key
	 */
	private verifyAndReadKey(key: string, acceptedFields: string[]): string {
		// parse as ANYKEY
		if (this.haveTransform && !key.includes("_")) {
			return key;
		}

		let [idStr, field] = parseKey(key, acceptedFields); // accepts both sfield and mfield

		if (this.idString === "") {
			this.idString = idStr;
		} else if (this.idString !== idStr) {
			throw new Error("Semantic error: multiple db referenced: " + idStr);
		}

		return field;
	}

	// transform section to insightResult and add idstrings
	public transformToResult(sec: Section): InsightResult {
		let res: InsightResult = {};
		let idxSec = sec as Indexable;
		for (let key in idxSec) {
			const cell = idxSec[key];
			if (cell !== undefined) {
				res[this.idString + "_" + key] = cell;
			}
		}
		return res;
	}

	// filter the columns in options
	public filterColumns(res: InsightResult): InsightResult {
		let transformed: InsightResult = {};
		let cell: number | string | undefined;
		this.columns.forEach((col) => {
			if (sFields.concat(mFields).includes(col)){
				cell = res[this.idString + "_" + col];
			} else {
				cell = res[col];
			}
			if (cell !== undefined) {
				transformed[this.idString + "_" + col] = cell;
			}
		});
		return transformed;
	}


	public sortRsults(results: InsightResult[]): InsightResult[] {
		return results.sort((e1, e2) => {
			if (this.direction === directions[1]) { // DOWN
				return optionCompare(e2, e1, this);
			}
			return optionCompare(e1, e2, this); // UP (default)
		});
	}
}


// compare using options
function optionCompare(elem1: InsightResult, elem2: InsightResult, options: Options): number {
	return compare(elem1, elem2, options.orderKeys, options.idString);
}

// generic compare with tiebreak
function compare(elem1: InsightResult, elem2: InsightResult, orderKeys: string[], idString: string): number {
	let res = 0;
	let i = 0;
	while (res === 0 && i < orderKeys.length) {
		let field = sFields.concat(mFields).includes(orderKeys[i]) ?
			idString + "_" + orderKeys[i] : orderKeys[i];
		res = compareByField(elem1, elem2, field);
		i++;
	}
	return res;
}

/**
 * Compare the order of 2 elems based on a single provided field
 */
export function compareByField(elem1: InsightResult, elem2: InsightResult, orderKey: string): number {
	const val1 = elem1[orderKey] as number | string;
	const val2 = elem2[orderKey] as number | string;
	if (val1 === val2) {
		return 0;
	} else {
		return (val1 > val2) ? 1 : -1;
	}
}

