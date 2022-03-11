/**
 * 'Options' portion of the query object
 */

import {parseKey, Query} from "./Query";
import {IndexableSection, Section} from "../controller/Section";
import {InsightResult} from "../controller/IInsightFacade";
import {mFields, sFields} from "./Filter";

export class Options {
	public idString: string; // specifies database
	public columns: string[]; // name of attributes, without database name
	public order: string; // name of attribute to order by, without database name

	constructor() {
		this.idString = "";
		this.columns = [];
		this.order = "";
	}

	public deserialize(input: any) {
		if (input.COLUMNS !== undefined) {
			for (let i in input.COLUMNS) {
				let field = this.verifyAndReadKey(input.COLUMNS[i]);
				this.columns.push(field);
			}

			if (input.ORDER !== undefined) {
				this.order = this.verifyAndReadKey(input.ORDER);
				return;
			}
		}
		throw new Error("Syntax error: missing COLUMNS or ORDER");
	}

	// verify key for semantic error & return field
	private verifyAndReadKey(key: string): string {
		let [idStr, field] = parseKey(key, 2); // accepts both sfield and mfield

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
			return compareByField(e1, e2, this.idString + "_" + this.order);
		});
	}
}

/**
 * Compare the order of 2 elems based on provided field
 */
function compareByField(elem1: InsightResult, elem2: InsightResult, order: string): number {
	const val1 = elem1[order] as number | string;
	const val2 = elem2[order] as number | string;
	if (val1 === val2) {
		return 0;
	} else {
		return (val1 > val2) ? 1 : -1;
	}
}

// compare with tie-break
function compare(elem1: InsightResult, elem2: InsightResult, options: Options): number {
	let res = compareByField(elem1, elem2, options.idString + "_" + options.order);
	if (res !== 0) {
		return res;
	}
	// tie-break
	let cols = options.columns;
	let i = 0;
	while (res === 0 && i <= cols.length) {
		if (cols[i] === options.order) {
			i++;
			continue;
		}
		res = compareByField(elem1, elem2, options.idString + "_" + cols[i]);
		i++;
	}
	return res;
}
