/**
 * Master class that assembles with the query object
 */
import {Filter, parseFilter, mFields, sFields} from "./Filter";
import {Options} from "./Options";
import * as fs from "fs";
import {dataDir} from "../controller/InsightFacade";

interface Query {
	body: Filter;
	options: Options;
}

/**
 * Given the query JSON, return query struct with body & options
 */
function parseQuery(input: any): Query{
	if (input.WHERE !== undefined && input.OPTIONS !== undefined) {
		let inputBody = parseFilter(input.WHERE);
		let inputOptions = new Options();
		inputOptions.deserialize(input.OPTIONS);

		let q: Query = {
			body: inputBody,
			options: inputOptions
		};
		verifyIdString(q);
		return q;
	}

	throw new Error("Syntax error: WHERE or OPTIONS missing");
}

// verifies the idstring exists
function verifyIdString(q: Query) {
	if (q.body.idString !== q.options.idString) {
		throw new Error("Semantic error: multiple dbs referenced");
	}
	if (!fs.existsSync(dataDir + q.body.idString)) {
		throw new Error("Semantic error: dataset file does not exist");
	}
}

/**
 * Helper; Parse key as a tuple of valid idstring and fields
 * @param key - original mkey or skey
 * @param fields - accepted range of fields
 */
function parseKey(key: string, fields: string[]): [string,string] {
	// let fields: string[];
	// if (keyType === 0) {
	// 	fields = mFields;
	// } else if (keyType === 1){
	// 	fields = sFields;
	// } else {
	// 	fields = mFields.concat(sFields);
	// }
	let keys = key.split("_");
	if (keys.length === 2) {
		if (fields.includes(keys[1])) {
			return [keys[0], keys[1]];
		}
	}
	throw new Error("Syntax error: field " + key + "not in accepted range.");
}

export {Query, parseQuery, parseKey};
