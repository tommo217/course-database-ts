export class Section {
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
