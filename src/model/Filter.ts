/**
 * 'Filters' portion of the query object
 */

import {Indexable, Section} from "../controller/Section";
import {parseKey} from "./Query";

/**
 * Given a JSON object of query BODY, return custom filter class
 * @param input: a JSON object without struct
 */
function parseFilter(input: any): Filter{
	if (Object.keys(input).length === 1) {
		for (let op in input) {
			if (logicOps.includes(op)) {
				let f = new LogicComparison();
				if (f.deserialize(input) === 1) {
					return f;
				}
			}
			if (mComparators.includes(op)) {
				let f = new MComparison();
				if (f.deserialize(input) === 1) {
					return f;
				}
			}
			if (op === "IS") {
				let f = new SComparison();
				if (f.deserialize(input) === 1) {
					return f;
				}
			}
			if (op === "NOT") {
				let f = new Negation();
				if (f.deserialize(input) === 1) {
					return f;
				}
			}
		}
	}

	throw new Error("Parsing failed, syntax error");
}

// Interface for all filter classes
interface Filter {
	idString: string;
	deserialize(input: any): void;
	evaluateEntry(entry: Indexable): boolean; // check if section satisfies filter
}

const logicOps = ["AND", "OR"];
class LogicComparison implements Filter{
	public idString: string;
	protected logic: string; // 0-AND, 1-OR
	protected filters: Filter[];

	constructor() {
		this.idString = "";
		this.logic = "";
		this.filters = [];
	}

	// deserialize JSON object; return 1 if successful, 0 if syntactically incorrect
	public deserialize(input: any): number {
		let result: number = 0;

		// syntax: LOGICCOMPARISON has only 1 key (logic)
		if (Object.keys(input).length > 1) {
			return 0;
		}

		for (let op in input) {
			if (logicOps.includes(op)){
				this.logic = op;
				let inputFilters = input[op];
				// deserialize all filters
				if (inputFilters instanceof Array) {
					for (let i in inputFilters) {
						// puts all filter references in filters
						this.filters.push(parseFilter(inputFilters[i]));
					}
					result = 1;
				}
			}
		}
		this.parseIdString();

		return result;
	}

	// Parse and verify all idstring of child filters
	private parseIdString(){
		this.idString = this.filters[0].idString;
		this.filters.forEach((elem) => {
			if (elem.idString !== this.idString) {
				throw new Error("Semantic error: multiple db referenced: " + elem.idString);
			}
		});
	}

	public evaluateEntry(entry: Indexable): boolean {
		// To optimize: compare against speed of iterative evaluation of filters
		let evals = this.filters.map((filter) => filter.evaluateEntry(entry));
		if (this.logic === logicOps[0]) { // AND
			return !evals.includes(false); // true if none of the filters evaluate to false
		} else { // OR
			return evals.includes(true); // true if one of the filters evaluate to true
		}
	}
}

const mComparators = ["LT", "GT", "EQ"];
const mFields = ["avg", "pass", "fail", "audit", "year", "lat" , "lon", "seats"];
class MComparison implements Filter{
	public mComparator: string;
	public idString: string;
	public mfield: string;
	public num: number;

	constructor() {
		this.mComparator = "";
		this.idString = ""; // id of the referenced dataset
		this.mfield = "";
		this.num = 0;
	}

	// deserialize JSON object; return 1 if successful, 0 if syntactically incorrect
	public deserialize(input: any): number {
		let result: number = 0;

		// syntax
		if (Object.keys(input).length > 1) {
			return 0;
		}

		for (let op in input) {
			if (mComparators.includes(op)) {
				this.mComparator = op;
			}
			// {' mkey ':' number '}
			if (Object.keys(input[op]).length > 1) {
				return 0;
			}
			for (let mkey in input[op]) {
				[this.idString, this.mfield] = parseKey(mkey, mFields);
				this.num = input[op][mkey];
				result = 1;
			}
		}
		return result;
	}

	public evaluateEntry(entry: Indexable): boolean {

		// guard for non-existent & incorrectly formatted value
		if (typeof entry[this.mfield] === "string"
			|| entry === undefined) {
			throw new Error("Expected mfield entry " + this.mfield + " to be number, but is string");
		}

		return this.compareVal(entry[this.mfield] as number);
	}

	// Compare given number to this.num by the operator
	private compareVal(val: number): boolean {
		switch (this.mComparator){
			case (mComparators[0]):  // LT
				return val < this.num;
			case (mComparators[1]): // GT
				return val > this.num;
			case(mComparators[2]): // EQ
				return val === this.num;
			default:
				throw new Error("mComparator initialised incorrectly: " + this.mComparator);
		}
	}
}

const sFields = ["dept", "id", "instructor", "title", "uuid", "fullname",
	"shortname", "number", "name", "address", "type", "furniture", "href"];
const inputFormat = /^[*]?[^*]*[*]?$/;
class SComparison implements Filter{
	public idString: string;
	public sfield: string;
	public inputStr: string; // includes wildcards

	constructor() {
		this.idString = ""; // id of the referenced dataset
		this.sfield = "";
		this.inputStr = "";
	}

	// deserialize JSON object; return 1 if successful, 0 if syntactically incorrect
	public deserialize(input: any): number {
		let result: number = 0;

		// syntax
		if (Object.keys(input).length > 1) {
			return 0;
		}

		for (let op in input) {
			if (op !== "IS") {
				return 0;
			}
			// {' skey ':' [*]? inputstring [*]? '}
			if (Object.keys(input[op]).length > 1) {
				return 0;
			}
			for (let skey in input[op]) {
				[this.idString, this.sfield] = parseKey(skey, sFields);
				if (inputFormat.test(input[op][skey])) { // check format
					this.inputStr = input[op][skey];
					result = 1;
				} else {
					return 0;
				}
			}
		}
		return result;
	}

	public evaluateEntry(entry: Indexable): boolean {
		// let entryDic = entry as Indexable;
		// guard for non-existent & incorrectly formatted value
		if (entry === undefined
			|| typeof entry[this.sfield] === "number") {
			throw new Error("Expected sfield entry " + this.sfield + " to be string, but is number");
		}

		return this.compareStr(entry[this.sfield] as string);
	}

	private compareStr(str: string): boolean {
		const matchPattern = RegExp("^"
			+ this.inputStr.replaceAll("*", ".*")
			+ "$");
		return matchPattern.test(str);
	}
}

class Negation implements Filter{
	public idString: string;
	public filter?: Filter;

	constructor() {
		this.idString = "";
	}

	// deserialize JSON object; return 1 if successful, 0 if syntactically incorrect
	public deserialize(input: any): number {
		let result: number = 0;

		// syntax: LOGICCOMPARISON has only 1 key (logic)
		if (Object.keys(input).length > 1) {
			return 0;
		}

		for (let op in input) {
			if (op !== "NOT") {
				return 0;
			}
			this.filter = parseFilter(input[op]);
			this.idString = this.filter.idString;
			result = 1;
		}

		return result;
	}

	public evaluateEntry(entry: Indexable): boolean {
		if (this.filter){
			return !this.filter.evaluateEntry(entry);
		}
		throw new Error("Negation lacks filter");
	}
}

export {Filter, parseFilter, sFields, mFields, logicOps};
