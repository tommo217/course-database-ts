export interface IndexableBuilding{
	[key: string]: string | number | undefined;  // for typecast as dict
}

export class Building {
	public _fullName?: string;
	public _shortName?: string;
	public _address?: string;
	public _href?: string;
	public _lat?: number;
	public _lon?: number;


	constructor(fullName: string, shortName: string, address: string,
		href: string, lat: number, lon: number) {
		this._fullName = fullName;
		this._shortName = shortName;
		this._address = address;
		this._href = href;
		this._lat = lat;
		this._lon = lon;
	}

	// public get href(): string {
	// 	return this._href as string;
	// }
	//
	// public set href(value: string) {
	// 	this._href = value;
	// }
	//
	// public get fullName(): string {
	// 	return this._fullName as string;
	// }
	//
	// public set fullName(value: string) {
	// 	this._fullName = value;
	// }
	//
	// public get shortName(): string {
	// 	return this._shortName as string;
	// }
	//
	// public set shortName(value: string) {
	// 	this._shortName = value;
	// }
	//
	// public get address(): string {
	// 	return this._address as string;
	// }
	//
	// public set address(value: string) {
	// 	this._address = value;
	// }
}
