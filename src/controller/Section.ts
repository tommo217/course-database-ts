export interface IndexableSection{
	[key: string]: string | number | undefined;  // for typecast as dict
}

export class Section{
	public avg?: number;
	public pass?: number;
	public fail?: number;
	public audit?: number;
	public year?: number;
	public dept?: string;
	public id?: string;
	public instructor?: string;
	public title?: string;
	public uuid?: string;

	constructor(avg: number, pass: number, fail: number, audit: number, year: number,
		dept: string, id: string, instructor: string, title: string, uuid: string) {
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.year = year;
		this.dept = dept;
		this.id = id;
		this.instructor = instructor;
		this.title = title;
		this.uuid = uuid;
	}
}

// export function createSectionFromJson(sect: any): Section | undefined {
// 	let avg: number = sect["Avg"];
// 	let pass: number = sect["Pass"];
// 	let fail: number = sect["Fail"];
// 	let audit: number = sect["Audit"];
// 	let year: number = sect["Section"] === "overall" ? 1900 : Number(sect["Year"]);
// 	let dept: string = sect["Subject"];
// 	let cId: string = sect["Course"]; // course ID
// 	let prof: string = sect["Professor"];// this is instructor in Section obj
// 	let title: string = sect["Title"];
// 	let uid: string = String(sect["id"]);// this is uuid in Section obj
// 	if(avg === undefined || pass === undefined || fail === undefined || audit === undefined || year === undefined ||
// 			dept === undefined || cId === undefined || prof === undefined || title === undefined || uid === undefined) {
// 		return undefined;
// 	}
// 	return new Section(avg, pass, fail, audit, year,dept, cId, prof, title, uid);
// }
