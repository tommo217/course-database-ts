/**
 * 'Options' portion of the query object
 */

import {parseKey} from "./Query";

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
			throw new Error("Syntax error: multiple db referenced: " + idStr);
		}

		return field;
	}
}
