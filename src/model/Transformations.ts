import {parseKey} from "./Query";
import {mFields, sFields} from "./Filter";
import {App} from "../App";
import {Options} from "./Options";

const applyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
export class Transformations {
	public idString: string;
	public group: string[];
	public applyRules: ApplyRule[];

	constructor(input: any) {
		this.idString = "";
		this.group = [];
		this.applyRules = [];
		this.deserialize(input);
	}

	/**
	 * Check that col exists in either GROUP or as an ApplyKey in ApplyRules
	 */
	public hasCol(col: string): boolean {
		if (this.group.includes(col)) {
			return true;
		} else {
			this.applyRules.forEach((rule) => {
				if (rule.applyKey === col) {
					return true;
				}
			});
		}
		return false;
	}

	private deserialize(input: any) {
		if (input["GROUP"] === undefined || input["APPLY"] === undefined) {
			throw new Error("Transformation Syntax: GROUP or APPLY missing");
		}

		for (let i in input["GROUP"]) {
			let field = this.verifyAndReadKey(input["GROUP"][i], mFields.concat(sFields));
			this.group.push(field);
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
class ApplyRule {
	public idString: string;
	public applyKey: string;  	// name of transformed field
	public applyToken: string;  // operation to perform on group
	public key: string;			// column on which to perform operation

	constructor(input: any) {
		this.idString = "";
		this.applyKey = "";
		this.applyToken = "";
		this.key = "";
		this.deserialize(input);
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
