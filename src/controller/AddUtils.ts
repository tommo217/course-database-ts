import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Section} from "./Section";
import {dataDir, metaDir} from "./InsightFacade";
import parse5 from "parse5";
import {Building} from "./Building";
import {Room} from "./Room";
import {JSZipObject} from "jszip";
import {rejects} from "assert";
// let numRows: number;
// let dataDir = "./data/";
// let metaDir = "./meta/";
// let storedIDs: string[] = [];// array of all the stored dataset IDs
let buildingTr: any[];
let roomTr: any[];
const http = require("http");

export class AddUtils {
	constructor() {
		let numRows = 0;
		buildingTr = [];
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

	public searchElement(elementType: string, attrs_name: string, attrs_value: string, node: any, container: any[]){
		// elementType:tag
		// table attrs_name = "class"
		// tbody attrs_name = []
		// td attrs_name = "class"
		// anchor attrs_name = href
		if (node === undefined) {
			return;
		}
		if (node.nodeName === elementType && node.tagName === elementType) {// check tag
			// check specification
			if(node.attrs.name === attrs_name) {
				if (attrs_name === "href") {
					// push href value to list
					container.push(node.attrs.value);
					return;
				} else if (attrs_value === "tr") {
					if (node.attrs.value === "odd views-row-first" || node.attrs.value === "even"
						|| node.attrs.value === "odd") { // check tr's attrs value
						// push tr to list
						container.push(node);
						return;
					}
				}
				// } else if(node.attrs.value === attrs_value) {
				// 	container.push(node);
				// 	return;
				// }
			}
		}
		// TODO: verify logic, make sure recursion working, do not change if statement logic
		let count = node.childNodes.length;
		for (let i = 0; i < count - 1; i++) {
			this.searchElement(elementType, attrs_name, attrs_value, node.childNodes[i], container);
		}
		this.searchElement(elementType, attrs_name, attrs_value, node.childNodes[count - 1], container);
	}

	public getBuilding(indexString: string): Promise <any[]> {
		const indexDocument = parse5.parse(indexString);
		// this.getBuildingsHref(indexDocument, trList);
		this.searchElement("tr", "class", "tr", indexDocument, buildingTr);
		if(buildingTr.length === 0) {
			return Promise.reject(new InsightError("No building"));
		}
		let buildingList: Building[] = []; // array of building objects
		// get building shorname, fullname, address, href from tr
		for (let tr of buildingTr) {
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
				// TODO: not sure
				fullName = fullNameArr[0].childNodes[0].childNodes[1].childNodes[0].value.trim();
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
			this.searchElement("a", "href", "", tr, hrefArr);
			if (hrefArr.length > 0) {
				href = hrefArr[0];
			}

			let latitude;
			let longitude;
			this.getGeolocation(addressURL).then((res: string) => {
				let geoData = JSON.parse(res);
				latitude = geoData.lat;
				longitude = geoData.lon;
				let building = new Building(fullName, code, address, href, latitude, longitude);
				buildingList.push(building);
			});
		}
		return Promise.resolve(buildingList);
	}

	public getGeolocation(URL: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			http.get("http://cs310.students.cs.ubc.ca:11316/api/v1/project_team686/" + URL, (response: any) => {
				let res = "";
				response.on("data", (data: string) => {
					res += data;
				});
				response.on("end", () => {
					return resolve (res);
				});
			}).on("error", () => {
				return reject("Error in http.get");
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
				roomHref = roomHrefArr[0].childNodes[0].childNodes[1].value.trim();
			}
			let roomName: string = building._shortName + "_" + roomNumber;
			let room = new Room(building._fullName, building._shortName, roomNumber, roomName,
				building._address, building._lat, building._lon, seatNumber, roomType, furnitureType, roomHref);
			roomData.push(room);
		}
	}

	public parseRoom(ZipObj: any, buildingList: any[], roomData: Room[]) {
		// verify roomCahe is not empty
		for (let building of buildingList) {
			roomTr = [];
			ZipObj.files(building._href).async("string").then((roomString: string)=>{
				const roomDocument = parse5.parse(roomString);
				this.searchElement("tr", "class", "tr", roomDocument, roomTr);
				this.createRoomObj(roomTr, building, roomData);
			});
		}
		return roomData.length;
	}
}
