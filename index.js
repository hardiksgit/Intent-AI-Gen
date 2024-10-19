const AWS = require("aws-sdk");
const csv = require("csv-parser");
const { Readable } = require("stream");

const s3 = new AWS.S3();

exports.handler = async (event) => {
  const bucketName = event.Records[0].s3.bucket.name;

  const objectKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );
  console.log("object key: ", objectKey);

  try {
    const file_data = await get_file_from_s3(bucketName, objectKey);
    console.log("file_data: ", file_data);

    await process_file_data(file_data);
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
    readable
      .pipe(csv())
      .on("data", async (row) => {
        console.log("Row:", row);

        //  const intents = await classify_intent(row.message);
        console.log("Intents Identified:", intents);
      })
      .on("end", () => {
        console.log("CSV Processing complete");
        resolve();
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
        reject(error);
      });
  });
};
