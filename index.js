const AWS = require("aws-sdk");
const csv = require("csv-parser");
const { Readable } = require("stream");
const { OpenAI } = require("openai");

const s3 = new AWS.S3();

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

exports.handler = async (event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const objectKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  try {
    const file_data = await get_file_from_s3(bucketName, objectKey);
    const results = await process_file_data(file_data);
    console.log("intents:: ", results);
  } catch (error) {
    console.error("Error processing CSV:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing CSV",
        error: error.message,
      }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "CSV processed successfully" }),
  };
};

const get_file_from_s3 = async (bucket, key) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const { Body } = await s3.getObject(params).promise();
  return Body;
};

const process_file_data = async (data) => {
  const readable = new Readable();
  readable.push(data);
  readable.push(null);

  return new Promise((resolve, reject) => {
    const intent_promises = [];

    readable
      .pipe(csv())
      .on("data", (row) => {
        const intent_promise = classify_intents(row.message)
          .then((intents) => {
            console.log(`Intents for ${row.sender_username}:`, intents);
            return { sender: row.sender_username, intents };
          })
          .catch((error) => {
            console.error("Error classifying intents:", error);
            return {
              sender: row.sender_username,
              intents: [],
              error: "Error processing message",
            };
          });

        intent_promises.push(intent_promise);
      })
      .on("end", async () => {
        try {
          const results = await Promise.all(intent_promises);
          console.log("CSV Processing complete:", results);
          resolve(results);
        } catch (error) {
          console.error("Error resolving intents:", error);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
};

const classify_intents = async (message) => {
  const prompt = `Identify the intent from the message: "${message}". List all identified intents without duplicates.`;
  try {
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const intents = response.choices[0].message.content
      .split("\n")
      .map((intent) => intent.trim())
      .filter(Boolean);

    return intents;
  } catch (error) {
    console.error("Error classifying intents:", error);
    return [];
  }
};
