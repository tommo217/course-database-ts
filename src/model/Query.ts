/**
 * Master class that assembles with the query object
 */
import {Filter, parseFilter, mFields, sFields} from "./Filter";
import {Options} from "./Options";
import {Transformations} from "./Transformations";
import * as fs from "fs";
import {dataDir} from "../controller/InsightFacade";
import {InsightResult} from "../controller/IInsightFacade";

interface Query {
	body: Filter;
	options: Options;
	transformations?: Transformations;
}

/**
 * Given the query JSON, return query struct with body & options
 * give error if query has syntax or semantic errors
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
function verifyIdString(q: Query) {
	if (q.body.idString !== q.options.idString) {
		throw new Error("WHERE and OPTIONS referencing different idstrings");
	}
	if (q.transformations !== undefined && q.transformations.idString !== q.body.idString) {
		throw new Error("WHERE and TRANSFORMATIONS referencing different idstrings");
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
 * Assuming that Transformations exists, check that
 * all COLUMNS terms must exist in Transformations.
 */
function verifyColumns(q: Query) {
	q.options.columns.forEach( (col) => {
		if (!q.transformations?.hasCol(col)) {
			throw new Error("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
		}
	});
}


export {Query, parseQuery, parseKey};
