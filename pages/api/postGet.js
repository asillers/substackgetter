import axios from "axios";
import cheerio from "cheerio";
import path from "path";
import fs from "fs";
export const dynamic = "force-dynamic";

async function processLink(link) {
	try {
		const response = await axios.get(link); // Use the link parameter passed to the function
		const html = response.data;
		const $ = cheerio.load(html);

		const scrapedData = [];

		// Scraping divs with class "post-title"
		$(".post-title").each((index, element) => {
			const title = $(element).html().trim();
			const dataObject = {
				title: title,
				content: "",
				isoDate: "",
			};
			scrapedData.push(dataObject);
		});

		// Scraping divs with class "available-content"
		$(".available-content").each((index, element) => {
			const titleElement = $(element)
				.closest(".post")
				.find(".post-title");
			const title = titleElement.html().trim();
			const contentElements = $(element).find(
				"p:not(.button-wrapper), blockquote",
			);
			const content = contentElements
				.map((index, el) => $.html(el))
				.get()
				.join("");
			const textContent = contentElements
				.map((index, el) => $(el).text())
				.get()
				.join("");

			const dataObject = scrapedData.find((obj) => obj.title === title);
			if (dataObject) {
				dataObject.content = content; // Store full HTML content
			}

			$("script").each((index, element) => {
				const scriptContent = $(element).html();
				if (scriptContent.trim().startsWith("window._preloads")) {
					const isoDate = extractDateTime(scriptContent);
					scrapedData[0].isoDate = isoDate;
				}
			});
		});

		// Read and update JSON file
		const filePath = path.resolve("./data/posts.json");
		let dataArray = [];
		try {
			const jsonData = fs.readFileSync(filePath);
			dataArray = JSON.parse(jsonData);
		} catch (error) {
			console.error("Error reading JSON file:", error);
		}

		if (scrapedData.length > 0) {
			const matched = dataArray.some(
				(item) => item[2] === scrapedData[0].isoDate,
			);

			if (!matched) {
				const newData = [
					scrapedData[0].title,
					scrapedData[0].content,
					scrapedData[0].isoDate,
				];
				// Function to compare dates for sorting
				const compareDates = (a, b) => {
					const dateA = new Date(a[2]);
					const dateB = new Date(b[2]);
					return dateA - dateB;
				};

				dataArray.push(newData);
				// Sort dataArray after pushing newData
				dataArray.sort(compareDates);
				try {
					fs.writeFileSync(
						filePath,
						JSON.stringify(dataArray, null, 2),
						console.log("Updated post log"),
					);
				} catch (error) {
					console.error("Error writing JSON file:", error);
				}
			} else {
				console.log("Data already exists for this date.");
			}
		} else {
			console.error("No data scraped.");
		}

		return scrapedData;
	} catch (error) {
		console.error("Error fetching data:", error);
		throw error;
	}
}

function extractDateTime(scriptContent) {
	const postDateRegex = /"post_date.+?(?=\",)/g;
	let isoDates = "";
	let match;
	while ((match = postDateRegex.exec(scriptContent)) !== null) {
		let isoDate = match[0].replace('"post_date\\":\\"', ""); // Remove "post_date\":\" from the beginning

		isoDates = isoDate.slice(0, -1); // Push the modified ISO date/time string
	}
	return isoDates;
}

async function fetchLinks(url) {
	try {
		const response = await axios.get(url);
		const html = response.data;
		const $ = cheerio.load(html);

		const links = [];
		$("a").each((index, element) => {
			const href = $(element).attr("href");
			if (
				href &&
				href.includes("SUBSTACKNAME.substack.com/p") &&
				!href.includes("comments")
			) {
				links.push(href);
			}
		});

		return links;
	} catch (error) {
		console.error("Error fetching links:", error);
		throw error;
	}
}

export default async function handler(req, res) {
	try {
		const archiveUrl = "https://SUBSTACKNAME.substack.com/archive";
		const links = await fetchLinks(archiveUrl);
		console.log(links);

		const scrapedData = [];
		for (const link of links) {
			if (
				link.includes("SUBSTACKNAME.substack.com/p") &&
				!link.includes("comments")
			) {
				const data = await processLink(link);
				scrapedData.push(...data);
			}
		}

		res.status(200).json({ links, scrapedData });
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({
			error: "An error occurred while extracting links.",
		});
	}
}
