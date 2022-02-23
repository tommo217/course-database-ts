/**
 * Master class that assembles with the query object
 */
import {Filter, parseFilter, mFields, sFields} from "./Filter";
import {Options} from "./Options";

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

		return {
			body: inputBody,
			options: inputOptions
		};
	}

	throw new Error("Syntax error: WHERE or OPTIONS missing");
}

/**
 * parse mkey or skey as a tuple of idstring and fields
 * @param key - original mkey or skey
 * @param keyType - 0-mkey 1-skey 2-either Other-either
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

export {Query, parseQuery, parseKey};
