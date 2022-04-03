import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import * as fs from "fs-extra";
import {InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static facade = new InsightFacade();


	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);
		// TODO: your other endpoints should go here
		// hard coded to add course and room
		this.express.put("/addCourse", Server.addCourse);
		this.express.put("/addRoom", Server.addRoom);
		// this.express.get("/list", Server.facade.listDatasets);
		this.express.post("/query", Server.query);
		this.express.put("/dataset/:id/:kind", Server.dataset);
		this.express.delete("/delete/:id", Server.deleteDataset);
		this.express.get("/datasets", Server.list);
	}

	private static deleteDataset(req: Request, res: Response) {
		Server.facade.removeDataset(req.params.id).then((str) => {
			res.status(200).json({result: str});
		}).catch((err) => {
			if(err === InsightError) {
				res.status(400).json({error: err});
			} else {
				res.status(404).json({error: "No such dataset found"});
			}
		});
	}

	private static list(req: Request, res: Response) {
		Server.facade.listDatasets().then((arr) => {
			res.status(200).json({result: arr});
		});
	}

	private static dataset(req: Request, res: Response) {
		const content = req.body.toString("base64");
		let dataId = req.params.id;
		let dataKind = InsightDatasetKind.Courses; // default
		if(req.params.kind === "rooms") {
			dataKind = InsightDatasetKind.Rooms;
		} else if(req.params.kind === "courses") {
			dataKind = InsightDatasetKind.Courses;
		} else {
			// console.log("in else");
			return res.status(400).json({error:"Not supported kind"});
		}
		Server.facade.addDataset(dataId,content,dataKind).then((arr) => {
			// console.log("Add course success");
			res.status(200).json({result: arr});
		}).catch((err) => {
			// console.log("Add course fail");
			res.status(400).json({error:err});
		});
	}

	private static addCourse(req: Request, res: Response) {
		// console.log(req.params);
		const content = fs.readFileSync("./test/resources/archives/courses.zip").toString("base64");
		Server.facade.addDataset("courses", content, InsightDatasetKind.Courses).then((arr) => {
			// console.log("Add course success");
			res.status(200).json({result: arr});
		}).catch((err) => {
			// console.log("Add course fail");
			res.status(400).json({error:err});
		});
	}

	private static addRoom(req: Request, res: Response) {
		// console.log(req.params);
		const content = fs.readFileSync("./test/resources/archives/rooms.zip").toString("base64");
		Server.facade.addDataset("rooms", content, InsightDatasetKind.Rooms).then((arr) => {
			// console.log("Add course success");
			res.status(200).json({result: arr});
		}).catch((err) => {
			// console.log("Add course fail");
			res.status(400).json({error:err});
		});
	}

	private static query(req: Request, res: Response) {
		// {"WHERE": {"AND": [{"IS": { "courses_dept": "math"}},{"IS":{ "courses_id": "200"}},{"GT": { "courses_year": 2000}},{"LT": { "courses_year": 2019}}]}
		// console.log("body type: " + typeof req.body);
		// console.log(req.body["WHERE"]);
		Server.facade.performQuery(req.body).then((arr) => {
			// console.log(arr);
			res.status(200).json({result: arr});
		}).catch((err) => {
			// console.log(err);
			res.status(400).json({error: err.message});
		});
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
