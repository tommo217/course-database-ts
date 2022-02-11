// Custom Query Class function

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
				let inputFilters = input.op;
				// deserialize all filters
				if (inputFilters instanceof Array) {
					for (let inputFilter in inputFilters) {
						// puts all filter references in filters
						this.filters.push(parseFilter(inputFilter));
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
			if (Object.keys(input.op).length > 1) {
				return 0;
			}
			for (let mkey in input.op) {
				let keys = mkey.split("_");
				if (keys.length > 2) {
					return 0;
				}
				if (mFields.includes(keys[1])) {
					this.idString = keys[0];
					this.mfield = keys[1];
					this.num = input.op.mkey;
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

const sFields = ["dept", "id", "instructor", "title", "uuid"];
class SComparison implements Filter{
	public idString: string;
	public sfield: string;
	public inputStr: string;

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
			if (Object.keys(input.op).length > 1) {
				return 0;
			}
			for (let skey in input.op) {
				let keys = skey.split("_");
				if (keys.length > 2) {
					return 0;
				}
				if (sFields.includes(keys[1])) {
					this.idString = keys[0];
					this.sfield = keys[1];
					this.inputStr = input.op.skey;
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
			this.filter = parseFilter(input.op);
			result = 1;
		}

		return result;
	}

	public filterEntries(entries: unknown) {
		// TODO
	}
}

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
