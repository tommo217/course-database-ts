export interface IndexableRoom{
	[key: string]: string | number | undefined;  // for typecast as dict
}

export class Room {
	public fullname?: string;
	public shortname?: string;
	public number?: string;
	public name?: string; // rooms_shortname+"_"+rooms_number
	public address?: string;
	public lat?: number;
	public lon?: number;
	public seats?: number;
	public type?: string;
	public furniture?: string;
	public href?: string;


	constructor(rooms_fullname: string | undefined, rooms_shortname: string | undefined, rooms_number: string,
		rooms_name: string, rooms_address: string | undefined, rooms_lat: number | undefined,
		rooms_lon: number | undefined, rooms_seats: number,
		rooms_type: string, rooms_furniture: string, rooms_href: string) {
		this.fullname = rooms_fullname;
		this.shortname = rooms_shortname;
		this.number = rooms_number;
		this.name = rooms_name;
		this.address = rooms_address;
		this.lat = rooms_lat;
		this.lon = rooms_lon;
		this.seats = rooms_seats;
		this.type = rooms_type;
		this.furniture = rooms_furniture;
		this.href = rooms_href;
	}
