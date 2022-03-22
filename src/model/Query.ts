/**
 * Master class that assembles with the query object
 */
import {Filter, parseFilter, mFields, sFields} from "./Filter";
import {Options} from "./Options";
import {Transformations} from "./Transformations";
import * as fs from "fs";
import {dataDir} from "../controller/InsightFacade";

interface Query {
	body: Filter;
	options: Options;
	transformations?: Transformations;
}

/**
 * Given the query JSON, return query struct with body & options
 */
function parseQuery(input: any): Query{
	if (input.WHERE !== undefined && input.OPTIONS !== undefined) {
		let inputBody = parseFilter(input.WHERE);
		let inputOptions = new Options();
		inputOptions.deserialize(input.OPTIONS, input.TRANSFORMATIONS !== undefined);

		let q: Query = {
			body: inputBody,
			options: inputOptions
		};

		// parse transformations if exists
		if (input.TRANSFORMATIONS !== undefined) {
			q.transformations = new Transformations(input.TRANSFORMATIONS);
			verifyColumns(q);
		}

		verifyIdString(q);
		return q;
	}

	throw new Error("Syntax error: WHERE or OPTIONS missing");
}

// verifies idstring is singular & exists on disk
// TODO: change to verify cache?
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
 * @param fields - accepted range of fields; if null, skip check
 */
function parseKey(key: string, fields: string[] | null): [string,string] {
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
		if (fields === null) {
			return [keys[0], keys[1]];
		} else if (fields.includes(keys[1])) {
			return [keys[0], keys[1]];
		}
	}
	throw new Error("Syntax error: field \"" + key + "\" not in accepted range.");
}

/**
 * Check that if a GROUP is present,
 * all COLUMNS terms must exist in Transformations.
 */
function verifyColumns(q: Query) {
	for (let col in q.options.columns) {
		if (!q.transformations?.hasCol(col)) {
			throw new Error("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
		}
	}
}

export {Query, parseQuery, parseKey};
