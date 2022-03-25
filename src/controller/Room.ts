export interface IndexableRoom{
	[key: string]: string | number | undefined;  // for typecast as dict
}

export class Room {
	private _rooms_fullname?: string;
	private _rooms_shortname?: string;
	private _rooms_number?: string;
	private _rooms_name?: string; // rooms_shortname+"_"+rooms_number
	private _rooms_address?: string;
	private _rooms_lat?: number;
	private _rooms_lon?: number;
	private _rooms_seats?: number;
	private _rooms_type?: string;
	private _rooms_furniture?: string;
	private _rooms_href?: string;


	constructor(rooms_fullname: string | undefined, rooms_shortname: string | undefined, rooms_number: string,
		rooms_name: string, rooms_address: string | undefined, rooms_lat: number | undefined,
		rooms_lon: number | undefined, rooms_seats: number,
		rooms_type: string, rooms_furniture: string, rooms_href: string) {
		this._rooms_fullname = rooms_fullname;
		this._rooms_shortname = rooms_shortname;
		this._rooms_number = rooms_number;
		this._rooms_name = rooms_name;
		this._rooms_address = rooms_address;
		this._rooms_lat = rooms_lat;
		this._rooms_lon = rooms_lon;
		this._rooms_seats = rooms_seats;
		this._rooms_type = rooms_type;
		this._rooms_furniture = rooms_furniture;
		this._rooms_href = rooms_href;
	}

	public get rooms_fullname(): string {
		return this._rooms_fullname as string;
	}

	public set rooms_fullname(value: string) {
		this._rooms_fullname = value;
	}

	public get rooms_shortname(): string {
		return this._rooms_shortname as string;
	}

	public set rooms_shortname(value: string) {
		this._rooms_shortname = value;
	}

	public get rooms_number(): string {
		return this._rooms_number as string;
	}

	public set rooms_number(value: string) {
		this._rooms_number = value;
	}

	public get rooms_name(): string {
		this._rooms_name = this.rooms_shortname + "_" + this.rooms_number;
		return this._rooms_name as string;
	}

	public get rooms_address(): string {
		return this._rooms_address as string;
	}

	public set rooms_address(value: string) {
		this._rooms_address = value;
	}

	public get rooms_lat(): number {
		return this._rooms_lat as number;
	}

	public set rooms_lat(value: number) {
		this._rooms_lat = value;
	}

	public get rooms_lon(): number {
		return this._rooms_lon as number;
	}

	public set rooms_lon(value: number) {
		this._rooms_lon = value;
	}

	public get rooms_seats(): number {
		return this._rooms_seats as number;
	}

	public set rooms_seats(value: number) {
		this._rooms_seats = value;
	}

	public get rooms_type(): string {
		return this._rooms_type as string;
	}

	public set rooms_type(value: string) {
		this._rooms_type = value;
	}

	public get rooms_furniture(): string {
		return this._rooms_furniture as string;
	}

	public set rooms_furniture(value: string) {
		this._rooms_furniture = value;
	}

	public get rooms_href(): string {
		return this._rooms_href as string;
	}

	public set rooms_href(value: string) {
		this._rooms_href = value;
	}
}
