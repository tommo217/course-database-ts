/**
 * 'Options' portion of the query object
 */

import {parseKey, Query} from "./Query";
import {IndexableSection, Section} from "../controller/Section";
import {InsightResult} from "../controller/IInsightFacade";
import {mFields, sFields} from "./Filter";

const directions = ["UP", "DOWN"];
export class Options {
	public idString: string; // specifies database
	public columns: string[]; // name of attributes, without database name
	public orderKeys: string[]; // name of attribute to order by, without database name
	public direction: string;

	constructor() {
		this.idString = "";
		this.columns = [];
		this.orderKeys = [];
		this.direction = directions[0];
	}

	public deserialize(input: any) {
		if (input.COLUMNS !== undefined) {
			for (let i in input.COLUMNS) {
				let field = this.verifyAndReadKey(input.COLUMNS[i], mFields.concat(sFields));
				this.columns.push(field);
			}

			// single string or object containing "dir" and "keys"
			if (input.ORDER !== undefined) {
				this.readOrderKeys(input.ORDER);
				return;
			}
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

	// Given an acceptable range of fields, verify key for semantic error & return field
	private verifyAndReadKey(key: string, acceptedFields: string[]): string {
		let [idStr, field] = parseKey(key, acceptedFields); // accepts both sfield and mfield

		if (this.idString === "") {
			this.idString = idStr;
		} else if (this.idString !== idStr) {
			throw new Error("Semantic error: multiple db referenced: " + idStr);
		}

		return field;
	}

	// transform section to insightresult based on query options
	public transformSections(sec: Section): InsightResult {
		let transformed: InsightResult = {};
		let idxSec = sec as IndexableSection;
		this.columns.forEach((col) => {
			const row = idxSec[col];
			if (row !== undefined) {
				transformed[this.idString + "_" + col] = row;
			}
		});
		return transformed as InsightResult;
	}

	public sortRsults(results: InsightResult[]): InsightResult[] {
		return results.sort((e1, e2) => {
			if (this.direction === directions[1]) { // DOWN
				return compare(e2, e1, this);
			}
			return compare(e1, e2, this); // UP (default)
		});
	}
}

/**
 * Compare the order of 2 elems based on a single provided field
 */
function compareByField(elem1: InsightResult, elem2: InsightResult, orderKey: string): number {
	const val1 = elem1[orderKey] as number | string;
	const val2 = elem2[orderKey] as number | string;
	if (val1 === val2) {
		return 0;
	} else {
		return (val1 > val2) ? 1 : -1;
	}
}

// compare with tie-break
function compare(elem1: InsightResult, elem2: InsightResult, options: Options): number {
	let res = 0;
	let i = 0;
	let keys = options.orderKeys;
	while (res === 0 && i < keys.length) {
		res = compareByField(elem1, elem2, options.idString + "_" + options.orderKeys[i]);
		i++;
	}
	return res;
}
