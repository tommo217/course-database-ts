/**
 * Given the query JSON, return query struct with body & options
 */
function parseQuery(input: any): Query{
	if (input.WHERE !== undefined && input.OPTIONS !== undefined) {
		let inputBody = parseFilter(input.WHERE);
		let inputOptions = new Options();
		inputOptions.deserialize(input.OPTIONS);

		return {
			body: inputBody,
			options: inputOptions
		};
	}

	throw new Error("Syntax error: WHERE or OPTIONS missing");
}


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

/**
 * Struct and class definitions
 */
interface Query {
	body: Filter;
	options: Options;
}

class Options {
	public idString: string; // specifies database
	public columns: string[];
	public order: string;

	constructor() {
		this.idString = "";
		this.columns = [];
		this.order = "";
	}

	public deserialize(input: any) {
		if (input.COLUMNS !== undefined) {
			for (let i in input.COLUMNS) {
				let [idStr, field] = parseKey(input.COLUMNS[i], 2);
				this.columns.push(field);
				if (this.idString === "") {
					this.idString = idStr;
				} else if (this.idString !== idStr) {
					throw new Error("Syntax error: multiple db referenced: " + idStr);
				}
			}

			if (input.ORDER !== undefined) {
				this.order = input.ORDER;
				return;
			}
		}
		throw new Error("Syntax error: missing COLUMNS or ORDER");
	}
}

/**
 * parse mkey or skey as a tuple of idstring and fields
 * @param keyType: 0-mkey 1-skey 2-either
 */
function parseKey(key: string, keyType: number): [string,string] {
	let fields: string[];
	if (keyType === 0) {
		fields = mFields;
	} else if (keyType === 1){
		fields = sFields;
	} else {
		fields = mFields.concat(sFields);
	}
	let keys = key.split("_");
	if (keys.length === 2) {
		if (fields.includes(keys[1])) {
			return [keys[0], keys[1]];
		}
	}
	throw new Error("Syntax error: invalid key" + key);
}

// Interface for all filter classes
interface Filter {
	deserialize(input: any): void;
	// TODO: each filter can filter an input from our dataset
	// TODO: return a promise?
	filterEntries(entries: unknown): unknown;
}

const logicOps = ["AND", "OR"];
class LogicComparison implements Filter{
	protected logic: string; // 0-AND, 1-OR
	protected filters: Filter[];

	constructor() {
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

		return result;
	}

	public filterEntries(entries: unknown) {
		// TODO
	}
}

const mComparators = ["LT", "GT", "EQ"];
const mFields = ["avg", "pass", "fail", "audit", "year"];
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
				[this.idString, this.mfield] = parseKey(mkey, 0);
				this.num = input[op][mkey];
				result = 1;
			}
		}
		return result;
	}

	public filterEntries(entries: unknown) {
		// TODO
	}
}

const sFields = ["dept", "id", "instructor", "title", "uuid"];
class SComparison implements Filter{
	public idString: string;
	public sfield: string;
	public inputStr: string; // TODO: check non-preceding *s

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
				[this.idString, this.sfield] = parseKey(skey, 1);
				this.inputStr = input[op][skey];
				result = 1;
			}
		}
		return result;
	}

	public filterEntries(entries: unknown) {
		// TODO
	}
}

class Negation implements Filter{
	public filter?: Filter;

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
			result = 1;
		}

		return result;
	}

	public filterEntries(entries: unknown) {
		// TODO
	}
}

export {parseQuery, Query, Filter, Options};
