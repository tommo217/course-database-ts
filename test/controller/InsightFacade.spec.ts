import {
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";
import {folderTest} from "@ubccpsc310/folder-test";
import {assert, expect} from "chai";
import exp from "constants";


describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Add future datasets here
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
	};

	// Load datasets
	before(function () {
		// Loads all datasets in datasetsToLoad
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Clear previous run (if it exists)
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// Resets the insightFacade instance
			// Runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// Resets the data directory (removing any cached data)
			// Makes each test independent
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		/**
		 * List Dataset (copied from Tom's suite)
		 */
		it("should list 0 dataset when empty", function (){
			return insightFacade.listDatasets().then((insightDataset) =>{
				expect(insightDataset).to.be.instanceof(Array);
				expect(insightDataset).to.have.length(0);
			});
		});

		it("should list 1 dataset correctly (async)", async function (){
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			const insightDataset = await insightFacade.listDatasets();
			// should be exactly this
			expect(insightDataset).to.deep.equal([{
				id: "courses",
				kind: InsightDatasetKind.Courses,
				numRows: 64612,
			}]);
		});

		it("should list 2 datasets correctly (async)", async function(){
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			await insightFacade.addDataset("courses-2", content, InsightDatasetKind.Courses);
			let insightDataset = await insightFacade.listDatasets();
			expect(insightDataset).to.be.instanceof(Array);
			expect(insightDataset).to.have.length(2);
			expect(insightDataset).to.have.deep.members([
				{
					id: "courses",
					kind: InsightDatasetKind.Courses,
					numRows: 64612,
				},
				{
					id: "courses-2",
					kind: InsightDatasetKind.Courses,
					numRows: 64612,
				}
			]);
		});

		/**
		 * Add Dataset (copied from Tom's suite)
		 */
		// This is a unit test. You should create more like this!
		it("Should add a valid dataset", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});

		it("should fulfill with 1 correct dataset ID", function (){
			const content: string = datasetContents.get("courses") ?? "";
			insightFacade.addDataset("courses", content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(["courses"]);
			});
		});

		it("should fulfill with 3 correct dataset ID", async function (){
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			await insightFacade.addDataset("courses-2", content, InsightDatasetKind.Courses);
			let result = await insightFacade.addDataset("courses-3", content, InsightDatasetKind.Courses);

			expect(result).to.have.length(3);
			expect(result).to.have.deep.members(["courses", "courses-2", "courses-3"]);
		});

		// An id is invalid if it contains an underscore, or is only whitespace characters.
		it("should reject underscore with InsightError", function (){
			const content: string = datasetContents.get("courses") ?? "";
			insightFacade.addDataset("wrong_courses", content, InsightDatasetKind.Courses)
				.then(() => {
					assert.fail();
				})
				.catch((err) => {
					expect(err).to.be.instanceof(InsightError);
				});
		});

		it("should reject whitespace ID with InsightError", async function (){
			const content: string = datasetContents.get("courses") ?? "";
			const promise = insightFacade.addDataset("    ", content, InsightDatasetKind.Courses);
			insightFacade.addDataset("wrong_courses", content, InsightDatasetKind.Courses)
				.then(() => {
					expect.fail("should not be added");
				})
				.catch((err) => {
					expect(err).to.be.instanceof(InsightError);
				});
		});

		it("should reject already exising ID with InsightError", async function (){
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			try {
				await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
				expect.fail("should not be added");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});


		/**
		 * Remove Dataset (copied from Tom's suite)
		 */
		it("should fulfill on successful removal", async function () {
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			insightFacade.removeDataset("courses")
				.catch((err) => {
					expect.fail();
				});
		});

		it("should fulfill with the id of the removed dataset", async function () {
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			await insightFacade.addDataset("courses-2", content, InsightDatasetKind.Courses);
			await insightFacade.addDataset("courses-3", content, InsightDatasetKind.Courses);

			const result = await insightFacade.removeDataset("courses-2");
			expect(result).to.equal("courses-2");
		});

		it("should have correct number of datasets after removals", async function () {
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			await insightFacade.addDataset("courses-2", content, InsightDatasetKind.Courses);
			await insightFacade.addDataset("courses-3", content, InsightDatasetKind.Courses);

			const dataSets = await insightFacade.listDatasets();
			await insightFacade.removeDataset("courses");
			await insightFacade.removeDataset("courses-2");
			const dataSetsAfter = await insightFacade.listDatasets();
			expect(dataSetsAfter.length).to.equal(dataSets.length - 2);
		});

		it("should reject on empty datasets with NotFoundError", function () {
			insightFacade.removeDataset("courses")
				.then(() => {
					expect.fail();
				})
				.catch((err) => {
					expect(err).to.be.instanceof(NotFoundError);
				});
		});

		it("should reject on non-existent datasets with NotFoundError", async function () {
			const content: string = datasetContents.get("courses") ?? "";
			await insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			await insightFacade.addDataset("courses-2", content, InsightDatasetKind.Courses);
			insightFacade.removeDataset("courses-3")
				.then(() => {
					expect.fail();
				})
				.catch((err) => {
					expect(err).to.be.instanceof(NotFoundError);
				});
		});

		it("should reject ID with spaces with InsightError", async function () {
			let invalidId = "    ";
			try {
				await insightFacade.removeDataset(invalidId);
				expect.fail("should fail on invalid id");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should reject ID with underscores with InsightError", async function () {
			let invalidId = "courses__invalid";
			try {
				await insightFacade.removeDataset(invalidId);
				expect.fail("should fail on invalid id");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});


	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(actual, expected) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});
