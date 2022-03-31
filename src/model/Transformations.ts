import {parseKey, Query} from "./Query";
import {mFields, sFields} from "./Filter";
import {App} from "../App";
import {compareByField, Options} from "./Options";
import {InsightResult} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";
import Decimal from "decimal.js";

export class Transformations {
	public idString: string;
	public groupBy: string[];
	public applyRules: ApplyRule[];

	constructor(input: any) {
		this.idString = "";
		this.groupBy = [];
		this.applyRules = [];
		this.deserialize(input);
	}

	/**
	 * Check that col exists in either GROUP or as an ApplyKey in ApplyRules
	 */
	public hasCol(col: string): boolean {
		if (this.groupBy.includes(col)) {
			return true;
		} else {
			for (let i in this.applyRules) {
				if (this.applyRules[i].applyKey === col) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Group a list of insightresults by the GroupBY fields and set the groups
	 * returns pre-results to be sorted by options
	 */
	public transformResults(entries: InsightResult[]) {
		let outputs: InsightResult[] = [];

		// order results by group, obtain groups
		let sorted = sortPreResultsWithOrder(entries, this.groupBy);
		let groups = [];
		let nextGroup: InsightResult[] = [];
		for (let i = 0; i < sorted.length; i++) {
			//  if this entry is in same group as last, increment into current group
			//  otherwise, put nextGroup into groups, clear nextGroup
			if (i === 0) {
				nextGroup.push(sorted[i]);
			} else if (this.areSameGroup(sorted[i - 1], sorted[i])) {
				nextGroup.push(sorted[i]);
			} else {
				groups.push(nextGroup);
				nextGroup = [];
				nextGroup.push(sorted[i]);
			}
		}
		if (nextGroup.length > 0) {
			groups.push(nextGroup);
		}
		// for each group, apply operation using applyRules
		// each group results in a row
		for (let group of groups) {
			outputs.push(this.transformGroup(group));
		}

		return outputs;
	}

	// checks if 2 insightResults belong in the same group, accroding to groupBy
	private areSameGroup(e1: InsightResult, e2: InsightResult) {
		for (let field of this.groupBy) {
			if (e1[field] !== e2[field]) {
				return false;
			}
		}
		return true;
	}

	// transform a group according to the applyRules into InsightResult
	private transformGroup(group: InsightResult[]): InsightResult {
		let res: InsightResult = {};
		// add existing fields
		for (let field of this.groupBy) {
			res[this.idString + "_" + field] = group[0][field];
		}
		// apply fields and add to res
		for (let rule of this.applyRules) {
			rule.apply(group);
			res[rule.applyKey] = rule.applyResult;
		}
		return res;
	}

	private deserialize(input: any) {
		if (input["GROUP"] === undefined || input["APPLY"] === undefined) {
			throw new Error("Transformation Syntax: GROUP or APPLY missing");
		}

		for (let i in input["GROUP"]) {
			let field = this.verifyAndReadKey(input["GROUP"][i], mFields.concat(sFields));
			this.groupBy.push(field);
		}

		for (let i in input["APPLY"]) {
			let rule = new ApplyRule(input["APPLY"][i]);
			// check idstring
			if (this.idString === "") {
				this.idString = rule.idString;
			} else if (this.idString !== rule.idString) {
				throw new Error("Transformation Syntax: multiple db referenced: " + rule.idString);
			}
			// check columns
			this.applyRules.push(rule);
		}

		if (this.groupBy.length < 1) {
			throw new Error("GROUP must be a non-empty array");
		}
	}

	// Given an acceptable range of fields, verify key for semantic error & return field
	private verifyAndReadKey(key: string, acceptedFields: string[]): string {

		let [idStr, field] = parseKey(key, acceptedFields); // accepts both sfield and mfield

		if (this.idString === "") {
			this.idString = idStr;
		} else if (this.idString !== idStr) {
			throw new Error("Transformation Syntax: multiple db referenced: " + idStr);
		}

		return field;
	}
}

const applyKeyFormat = /^[^_]+$/;
const applyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
class ApplyRule {
	public idString: string;
	public applyKey: string;  	// name of transformed field
	public applyToken: string;  // operation to perform on group
	public key: string;			// column on which to perform operation
	public applyResult: number | string; // result of applyRule

	constructor(input: any) {
		this.idString = "";
		this.applyKey = "";
		this.applyToken = "";
		this.key = "";
		this.applyResult = -1;
		this.deserialize(input);
	}

	/**
	 * Given a group of insightresults, apply operation and put result in applyResult
	 */
	public apply(group: InsightResult[]) {
		if (this.applyToken === "MAX") {
			let sorted = sortPreResultsWithOrder(group, [this.key]);
			this.applyResult = sorted[sorted.length - 1][this.key];
		} else if (this.applyToken === "MIN") {
			let sorted = sortPreResultsWithOrder(group, [this.key]);
			this.applyResult = sorted[0][this.key];
		} else if (this.applyToken === "AVG") {
			if (!mFields.includes(this.key)) {
				throw new Error("Invalid key type in AVG");
			}
			this.applyResult = Number( (this.sumColumn(group, this.key).toNumber() / group.length).toFixed(2) );
		} else if (this.applyToken === "COUNT") {
			this.applyResult = this.countUniques(group, this.key);
		} else if (this.applyToken === "SUM") {
			if (!mFields.includes(this.key)) {
				throw new Error("Invalid key type in SUM");
			}
			this.applyResult = this.sumColumn(group, this.key).toNumber();
		}
	}

	/**
	 * Sum the value of a column in group
	 * @param group array of insightresults
	 * @param col column to sum down
	 */
	private sumColumn(group: InsightResult[], col: string): Decimal {
		let sum: Decimal = new Decimal(0);
		for (let key in group) {
			sum = sum.plus(group[key][col] as number);
			// sum += group[key][col] as number;
		}
		return sum;
	}

	private countUniques(group: InsightResult[], col: string): number {
		let uniqueCounts = 0;
		for (let i = 0; i < group.length; i++) {
			if (i === 0) {
				uniqueCounts++;
			} else {
				if (group[i][col] !== group[i - 1][col]) {
					uniqueCounts++;
				}
			}
		}
		return uniqueCounts;
	}

	private deserialize(input: any) {
		// syntax
		// { applykey : { APPLYTOKEN : key }}
		if (Object.keys(input).length > 1) {
			throw new Error("Transformation Syntax: Invalid ApplyRule: " + input.toString());
		}

		for (let op in input) {
			if (applyKeyFormat.test(op)) {
				this.applyKey = op;

				if (Object.keys(input[op]).length > 1) {
					throw new Error("Transformation Syntax: Invalid ApplyRule: " + input.toString());
				}
				// { APPLYTOKEN : key }
				for (let token in input[op]) {
					if(applyTokens.includes(token)) {
						this.applyToken = token;
						let [idstring, key] = parseKey(input[op][token], sFields.concat(mFields));
						this.idString = idstring;
						this.key = key;
						return;
					}
				}
			}
		}

		throw new Error("Transformation Syntax: Invalid ApplyRule: " + input.toString());
	}
}

/**
 * Sort insightResults by the orderkeys provided (ascending)
 * assumes result entries do not have idstring
 */
export function sortPreResultsWithOrder(results: InsightResult[], orderKeys: string[]) {
	return results.sort((e1, e2) => {
		return comparePreResults(e1, e2, orderKeys);
	});
}

// compare overload, for insightResults without idstring
function comparePreResults(elem1: InsightResult, elem2: InsightResult, orderKeys: string[]): number {
	let res = 0;
	let i = 0;
	while (res === 0 && i < orderKeys.length) {
		res = compareByField(elem1, elem2, orderKeys[i]);
		i++;
	}
	return res;
}
