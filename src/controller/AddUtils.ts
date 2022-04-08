import {InsightDatasetKind} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Section} from "./Section";
import {dataDir, metaDir} from "./InsightFacade";
import parse5 from "parse5";
import {Building} from "./Building";
import {Room} from "./Room";

let trList: any[];
let roomTr: any[];
let buildingList: Building[]; // list of building objects
const http = require("http");

export class AddUtils {
	constructor() {
		trList = [];
		roomTr = [];
		buildingList = [];
	}

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
							// need to match tag and attrs_name before adding tr
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

	public getBuilding(indexString: string): Promise<Building[]> {
		buildingList = [];
		trList = [];
		const indexDocument = parse5.parse(indexString);
		let promises: Array<Promise<any>> = [];
		this.searchElement("tr", "class", "", indexDocument, trList);// attrs_name has to be "class" to be able to find actual trs within a table
		if(trList.length >= 0) {
			// get building shorname, fullname, address, href from tr
			for (let tr of trList) {
				let codeArr: any[] = [];// building code container, has to be an array to be passed in search function
				let code: string = ""; // building short name
				this.searchElement("td", "class", "views-field views-field-field-building-code", tr, codeArr);
				if (codeArr.length > 0) {
					code = codeArr[0].childNodes[0].value.trim();
				}

				let fullNameArr: any[] = [];
				let fullName: string = "";
				this.searchElement("td", "class", "views-field views-field-title", tr, fullNameArr);
				if(fullNameArr.length > 0) {
					fullName = fullNameArr[0].childNodes[1].childNodes[0].value.trim();
				}

				let addressArr: any[] = [];
				let address: string = "";
				this.searchElement("td", "class", "views-field views-field-field-building-address", tr, addressArr);
				if (addressArr.length > 0) {
					address = addressArr[0].childNodes[0].value.trim();
				}

				let hrefArr: any[] = [];
				let href: string = "";
				// this.searchElement("a", "href", "", tr, hrefArr);
				this.searchElement("td", "class", "views-field views-field-nothing", tr, hrefArr);
				if (hrefArr.length > 0) {
					href = hrefArr[0].childNodes[1].attrs[0].value.trim().replace(".", "rooms");
				}
				let building = new Building(fullName, code, address, href);
				promises.push(this.getGeolocation(building));
			}
		}
		return Promise.all(promises).then(() => {
			if (buildingList.length <= 0 ) {
				return Promise.reject("No building");
			}
			return Promise.resolve(buildingList);
		});
	}

	public getGeolocation(building: Building): Promise<void> {
		let URL = encodeURIComponent(building.address);
		return new Promise<void>((resolved) => { // change resolve to something else
			http.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team686/" + URL, (response: any) => {
				let res = "";
				response.on("data", (data: string) => {
					res += data;
				});
				response.on("end", () => {
					let geoData = JSON.parse(res);
					building.setLat(geoData.lat);
					building.setLon(geoData.lon);
					buildingList.push(building);
					return resolved ();
				});
			}).on("error", () => {
				// skip this building, do nothing
				return resolved ();
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
				seatNumber = Number(seatNumberArr[0].childNodes[0].value.trim());
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
			let roomName: string = building.shortName + "_" + roomNumber;
			let latitude = building.getLat();
			let longitude = building.getLon();
			let room = new Room(building.fullName, building.shortName, roomNumber, roomName,
				building.address, latitude, longitude, seatNumber, roomType, furnitureType, roomHref);
			roomData.push(room);
		}
	}

	public loadRoom(zip: any, list: any[], roomData: Room[]){
		let promises: Array<Promise<any>> = [];
		for(let building of list) {
			promises.push(this.parseRoom(zip, building, roomData));
		}
		return Promise.all(promises);
	}

	private parseRoom(zip: any, building: any, roomData: Room[]): Promise<void>{
		return zip.file(building.href).async("string").then((roomString: string) => {
			roomTr = [];
			const roomDocument = parse5.parse(roomString);
			this.searchElement("tr", "class", "", roomDocument, roomTr);
			this.createRoomObj(roomTr, building, roomData);
			return Promise.resolve();
		});
	}
}
