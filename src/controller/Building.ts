export interface IndexableBuilding{
	[key: string]: string | number | undefined;  // for typecast as dict
}

export class Building {
	public fullName: string;
	public shortName: string;
	public address: string;
	public href: string;
	private lat: number = 0;
	private lon: number = 0;


	constructor(fullName: string, shortName: string, address: string,
		href: string) {
		this.fullName = fullName;
		this.shortName = shortName;
		this.address = address;
		this.href = href;
	}


	public getLat(): number {
		return this.lat;
	}

	public setLat(value: number) {
		this.lat = value;
	}

	public getLon(): number {
		return this.lon;
	}

	public setLon(value: number) {
		this.lon = value;
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
