import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Section} from "./Section";
import {dataDir, metaDir} from "./InsightFacade";
import parse5 from "parse5";
import {Building} from "./Building";
import {Room} from "./Room";
import {JSZipObject} from "jszip";
import {rejects} from "assert";
import undefinedError = Mocha.utils.undefinedError;
// let numRows: number;
// let dataDir = "./data/";
// let metaDir = "./meta/";
// let storedIDs: string[] = [];// array of all the stored dataset IDs
let trList: any[];
let roomTr: any[];
const http = require("http");

export class AddUtils {
	constructor() {
		let numRows = 0;
		trList = [];
		roomTr = [];
	}

	// public addRoomData(id: string, content: string, kind: InsightDatasetKind, indexString: string): Promise<any> {
	// 	const indexDocument = parse5.parse(indexString);
	// 	buildingList = this.getBuildingsHref(indexDocument);
	// 	for(let building of buildingList) {
	// 	}
	// 	// open files
	// }

	public createSectionObjects(sectionArr: any, sectionData: Section[]) {
		for(const sect of sectionArr) {
			let avg: number = sect["Avg"];
			let pass: number = sect["Pass"];
			let fail: number = sect["Fail"];
			let audit: number = sect["Audit"];
			let year: number = sect["Section"] === "overall" ? 1900 : Number(sect["Year"]);
			let dept: string = sect["Subject"];
			let cId: string = sect["Course"]; // course ID
			let prof: string = sect["Professor"];// this is instructor in Section obj
			let title: string = sect["Title"];
			let uid: string = String(sect["id"]);// this is uuid in Section obj

			if(avg === undefined || pass === undefined || fail === undefined
				|| audit === undefined || year === undefined ||
				dept === undefined || cId === undefined || prof === undefined
				|| title === undefined || uid === undefined) {
				continue;
			}
			let thisSection: Section =
				new Section(avg, pass, fail, audit, year,dept, cId, prof, title, uid);
			sectionData.push(thisSection);
		}
	}

	public parseCourse(array: string[], ID: string, storedIDs: string[], sectionData: Section[]): number{
		for (const element of array) { // element is the text string of the course file.
			let course: any;
			try{
				course = JSON.parse(element);// course is the content in each course file
			} catch (e) {
				console.log(e);
			}
			let sectionsArr = course["result"];// an array holding all the sections in this course
			if(sectionsArr.length > 0) {// has section data in this course file
				// check all sections, extract query keys and put into Section object, skip invalid sections
				this.createSectionObjects(sectionsArr, sectionData);
			}
				// return sectionData.length;
		}
		return sectionData.length;
	}

	public writeToDisc(datasetID: string, kind: InsightDatasetKind, numRow: number,  data: any[]) {
		let datasetObj = JSON.stringify({datasetID, kind, numRow, data});
		let metaData = JSON.stringify({datasetID, kind, numRow});
		try {
			fs.outputFileSync((dataDir + datasetID), datasetObj);
			fs.outputFileSync((metaDir + datasetID + "_meta"), metaData);
		} catch (e) {
			// return Promise.reject(new InsightError("Write to disk error"));
			console.log(e);
		}
	}

	public searchElement(tag: string, attrs_name: string, attrs_value: string, node: any, container: any[]){
		// td: attrs_name = "class"
		// tr: attrs_name = "class"
		// a: attrs_name = "href"
		if (node === undefined) {
			return;
		}
		if (node.nodeName === tag && node.tagName === tag) {// check tag
			// check specification
			for (let obj of node.attrs) {
				if (obj.name === attrs_name) {
					if (attrs_name === "href") { // find href from anchor
						container.push(obj.value);
					} else { // attrs_name = class
						if (obj.value === attrs_value) { // td
							container.push(node);
						} else if (tag === "tr") {
							// add tr
							container.push(node);
						}
					}
				}
			}
		}

		if (node.childNodes !== undefined) {
			for (let child of node.childNodes) {
				this.searchElement(tag, attrs_name, attrs_value, child, container);
			}
		}
	}

	public searchTbody(node: any, container: any[]){
		if (node === undefined) {
			return;
		}
		if (node.nodeName === "tbody" && node.tagName === "tbody") {// check tag
			container.push(node);
		}
		if (node.childNodes !== undefined) {
			for (let child of node.childNodes) {
				this.searchTbody(child, container);
			}
		}
	}

	public getTbody(indexDocument: any) {
		let tbodyArr: any[] = [];
		this.searchTbody(indexDocument, tbodyArr);
		let tb = tbodyArr[0];
		this.searchElement("tr", "class", "", tb, trList);
	}

	public getBuilding(indexString: string): any[] {
		const indexDocument = parse5.parse(indexString);
		// this.getTbody(indexDocument);
		this.searchElement("tr", "class", "", indexDocument, trList);
		let buildingList: Building[] = []; // array of building objects
		if(trList.length >= 0) {
			// get building shorname, fullname, address, href from tr
			for (let tr of trList) {
				let codeArr: any[] = [];// building code container, has to be an array to be passed in search function
				let code: string = ""; // building short name
				this.searchElement("td", "class", "views-field views-field-field-building-code", tr, codeArr);
				if (codeArr.length > 0) {
					code = codeArr[0].childNodes[0].value.trim();
				} // got code

				let fullNameArr: any[] = [];
				let fullName: string = "";
				this.searchElement("td", "class", "views-field views-field-title", tr, fullNameArr);
				if(fullNameArr.length > 0) {
					fullName = fullNameArr[0].childNodes[1].childNodes[0].value.trim();
				}

				let addressArr: any[] = [];
				let address: string = "";
				let addressURL: string = "";
				this.searchElement("td", "class", "views-field views-field-field-building-address", tr, addressArr);
				if (addressArr.length > 0) {
					address = addressArr[0].childNodes[0].value.trim();
					addressURL = encodeURIComponent(address);
				}

				let hrefArr: any[] = [];
				let href: string = "";
				// this.searchElement("a", "href", "", tr, hrefArr);
				this.searchElement("td", "class", "views-field views-field-nothing", tr, hrefArr);
				if (hrefArr.length > 0) {
					href = hrefArr[0].childNodes[1].attrs[0].value.trim();
				}

				let latitude;
				let longitude;
				this.getGeolocation(addressURL).then((res: string) => {
					let geoData = JSON.parse(res);
					latitude = geoData.lat;
					longitude = geoData.lon;
					// building = new Building(fullName, code, address, href, latitude, longitude);
					buildingList.push(new Building(fullName, code, address, href, latitude, longitude));
					// let num = buildingList.length;
				});
				// buildingList.push(new Building(fullName, code, address, href));
			}
		}
		// let num = buildingList.length
		return buildingList;
	}

	public getGeolocation(URL: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			http.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team686/" + URL,
				(response: any) => {
					let res = "";
					response.on("data", (data: string) => {
						res += data;
					});
					response.on("end", () => {
						return resolve (res);
					});
				}).on("error", (err: Error) => {
				return reject(err);
			});
		});
	}

	public createRoomObj(trArr: any[], building: Building, roomData: Room[]) {
		for (let tr of trArr) {
			let roomNumberArr: any[] = [];
			let roomNumber: string = "";
			this.searchElement("td", "class", "views-field views-field-field-room-number", tr, roomNumberArr);
			if(roomNumberArr.length > 0) {
				roomNumber = roomNumberArr[0].childNodes[1].childNodes[0].value.trim();
			}

			let seatNumberArr: any[] = [];
			let seatNumber: number = 0;
			this.searchElement("td", "class", "views-field views-field-field-room-capacity", tr, seatNumberArr);
			if(seatNumberArr.length > 0) {
				seatNumber = seatNumberArr[0].childNodes[0].value.trim();
			}

			let furnitureTypeArr: any[] = [];
			let furnitureType: string = "";
			this.searchElement("td", "class",
				"views-field views-field-field-room-furniture", tr, furnitureTypeArr);
			if(furnitureTypeArr.length > 0) {
				furnitureType = furnitureTypeArr[0].childNodes[0].value.trim();
			}

			let roomTypeArr: any[] = [];
			let roomType: string = "";
			this.searchElement("td", "class", "views-field views-field-field-room-type", tr, roomTypeArr);
			if(roomTypeArr.length > 0) {
				roomType = roomTypeArr[0].childNodes[0].value.trim();
			}

			let roomHrefArr: any[] = [];
			let roomHref: string = "";
			this.searchElement("td", "class", "views-field views-field-nothing", tr, roomHrefArr);
			if(roomHrefArr.length > 0) {
				roomHref = roomHrefArr[0].childNodes[1].attrs[0].value.trim();
			}
			let roomName: string = building._shortName + "_" + roomNumber;
			let room = new Room(building._fullName, building._shortName, roomNumber, roomName,
				building._address, building._lat, building._lon, seatNumber, roomType, furnitureType, roomHref);
			roomData.push(room);
		}
	}

	public parseRoom(ZipObj: any, buildingList: any[], roomData: Room[]): number{
		for (let building of buildingList) {
			roomTr = [];
			ZipObj.files(building._href).async("string").then((roomString: string)=>{ // TODO: might be ZipObj.file
				const roomDocument = parse5.parse(roomString);
				this.searchElement("tr", "class", "", roomDocument, roomTr);
				this.createRoomObj(roomTr, building, roomData);
			});
		}
		return roomData.length;
	}
}
