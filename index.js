import csv from "csv-parser";
import { OpenAI } from "openai";
import { get_best_matching_response } from "./build_response.js";
import Conversation from "./models/conversation.js";
import mongoose from "mongoose";
import {
  GetObjectCommand,
  NoSuchKey,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

const mongoURI = process.env["MONGODB_URI"];
const intentResponses = {
  instagram: {
    "Request for international shipping information":
      "Hey {{sender_username}}, we offer international shipping to 50 countries.",
    "Request for veteran discount":
      "Hey {{sender_username}}, we offer 10% discount to veterans.",
    "Ask for return policy":
      "Hey {{sender_username}}, we accept returns within 30 days of purchase. Check out our return policy on our website.",
    "Ask for product availability":
      "Hey {{sender_username}}, the product you're interested in is available. Hurry before it sells out!",
    "Request for tracking information":
      "Hey {{sender_username}}, you can track your order using the tracking number we sent via email. Let us know if you need help!",
    "Request for coupon or discount code":
      "Hey {{sender_username}}, we currently have a discount! Use code SAVE20 at checkout for 20% off your next order.",
    "Ask for store hours":
      "Hey {{sender_username}}, our store is open from 9 AM to 8 PM, Monday through Saturday.",
    "Inquire about payment options":
      "Hey {{sender_username}}, we accept all major credit cards, PayPal, and Apple Pay.",
    "Ask for product recommendations":
      "Hey {{sender_username}}, based on your interest, we recommend checking out our latest collection of [Product Category].",
    "Inquire about loyalty program":
      "Hey {{sender_username}}, sign up for our loyalty program and earn points on every purchase! Visit our website for more details.",
  },
  facebook: {
    "Request for international shipping information":
      "Hi {{sender_username}}, we provide international shipping in selected regions. Please check our shipping page for details.",
    "Request for veteran discount":
      "Hi {{sender_username}}, we offer a special discount for veterans. Use code VET10 at checkout!",
    "Ask for return policy":
      "Hi {{sender_username}}, we offer easy returns within 30 days of purchase. Visit our return policy page for more info.",
    "Ask for product availability":
      "Hi {{sender_username}}, the product you're looking for is in stock. Order now while supplies last!",
    "Request for tracking information":
      "Hi {{sender_username}}, you can track your order with the tracking number we sent via email. Let us know if you need further assistance.",
    "Request for coupon or discount code":
      "Hi {{sender_username}}, get 20% off your order with code SAVE20 at checkout!",
    "Ask for store hours":
      "Hi {{sender_username}}, our store is open from 9 AM to 8 PM, Monday to Saturday.",
    "Inquire about payment options":
      "Hi {{sender_username}}, we accept all major credit cards, PayPal, and Apple Pay for your convenience.",
    "Ask for product recommendations":
      "Hi {{sender_username}}, we recommend checking out our newest arrivals in [Product Category]. Let us know if you'd like more suggestions!",
    "Inquire about loyalty program":
      "Hi {{sender_username}}, sign up for our loyalty program to earn points and enjoy exclusive benefits!",
  },
  whatsapp: {
    "Request for international shipping information":
      "Hello {{sender_username}}, yes, we do international shipping! Check out our shipping policy on the website.",
    "Request for veteran discount":
      "Hello {{sender_username}}, veterans get 10% off with code VET10. Thank you for your service!",
    "Ask for return policy":
      "Hello {{sender_username}}, we have a 30-day return policy. Please check out our website for the complete details.",
    "Ask for product availability":
      "Hello {{sender_username}}, the product is currently available. Make sure to grab yours while it lasts!",
    "Request for tracking information":
      "Hello {{sender_username}}, your tracking details are in the confirmation email. Reach out if you need assistance!",
    "Request for coupon or discount code":
      "Hello {{sender_username}}, use code SAVE20 to enjoy 20% off on your next purchase!",
    "Ask for store hours":
      "Hello {{sender_username}}, our store operates from 9 AM to 8 PM, Monday to Saturday.",
    "Inquire about payment options":
      "Hello {{sender_username}}, we accept credit cards, PayPal, and Apple Pay.",
    "Ask for product recommendations":
      "Hello {{sender_username}}, based on what you're looking for, we suggest checking out our [Product Category].",
    "Inquire about loyalty program":
      "Hello {{sender_username}}, you can join our loyalty program to earn points and get exclusive rewards!",
  },
  email: {
    "Request for international shipping information":
      "Dear {{sender_username}}, we are pleased to offer international shipping to over 50 countries. Visit our website for more details.",
    "Request for veteran discount":
      "Dear {{sender_username}}, we offer a 10% discount to veterans. Please use the code VET10 at checkout.",
    "Ask for return policy":
      "Dear {{sender_username}}, we have a hassle-free 30-day return policy. Visit our return policy page for more details.",
    "Ask for product availability":
      "Dear {{sender_username}}, the product you are looking for is available. Place your order soon!",
    "Request for tracking information":
      "Dear {{sender_username}}, your order can be tracked using the tracking number provided in your order confirmation email.",
    "Request for coupon or discount code":
      "Dear {{sender_username}}, enjoy 20% off your next order with the code SAVE20.",
    "Ask for store hours":
      "Dear {{sender_username}}, our store is open from 9 AM to 8 PM, Monday through Saturday.",
    "Inquire about payment options":
      "Dear {{sender_username}}, we accept credit cards, PayPal, and Apple Pay. Visit our payment options page for more details.",
    "Ask for product recommendations":
      "Dear {{sender_username}}, we recommend exploring our latest collection of [Product Category]. Let us know if you need more assistance!",
    "Inquire about loyalty program":
      "Dear {{sender_username}}, join our loyalty program to earn points and enjoy exclusive discounts!",
  },
};

export const handler = async (event) => {
  await connect_database();
  const bucketName = event.Records[0].s3.bucket.name;
  const objectKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  try {
    const file_data = await get_file_from_s3(bucketName, objectKey);
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

const connect_database = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error("Could not connect to MongoDB");
  }
};

const get_file_from_s3 = async (bucket, key) => {
  const client = new S3Client({});
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const str = await response.Body.transformToString();
    return str;
  } catch (caught) {
    if (caught instanceof NoSuchKey) {
      console.error(
        `Error from S3 while getting object "${key}" from "${bucketName}". No such key exists.`
      );
    } else if (caught instanceof S3ServiceException) {
      console.error(
        `Error from S3 while getting object from ${bucketName}.  ${caught.name}: ${caught.message}`
      );
    } else {
      throw caught;
    }
  }
};

const process_file_data = async (data) => {
  const readable = new Readable();
  readable.push(data);
  readable.push(null);

  return new Promise((resolve, reject) => {
    const intent_promises = [];

    readable
      .pipe(csv())
      .on("data", async (row) => {
        const { sender_username, receiver_username, message, channel } = row;
        console.log("row", row);

        try {
          const intents = await classify_intents(message);
          console.log("intents", intents);

          let response = "";
          for (const intent of intents) {
            const intent_keys = Object.keys(intentResponses[channel]);

            response = await get_best_matching_response(
              intent,
              channel,
              sender_username,
              intent_keys
            );
            if (response) break;
          }
          console.log("response", response);

          const conversation = new Conversation({
            sender_username,
            receiver_username,
            message,
            channel,
            intents,
            response,
          });
          await conversation.save();
          console.log("saved!");
        } catch (error) {
          console.error("Error saving conversation:", error);
        }
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
