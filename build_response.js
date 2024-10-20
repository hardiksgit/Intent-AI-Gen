import { HfInference } from "@huggingface/inference";
// import { intentResponses } from "./models/predefined_responses.js";
const hf_api_key = process.env.HUGGINGFACE_API_KEY;
const hf = new HfInference(hf_api_key);
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

const get_best_matching_intent = async (intent, intent_keys) => {
  try {
    const result = await hf.sentenceSimilarity({
      model: "sentence-transformers/paraphrase-xlm-r-multilingual-v1",
      inputs: {
        source_sentence: intent,
        sentences: intent_keys,
      },
    });

    const best_match_index = result.findIndex(
      (score) => score === Math.max(...result)
    );
    return intent_keys[best_match_index];
  } catch (error) {
    console.error("Error with Huggingface Inference API:", error);
    throw error;
  }
};

export const get_best_matching_response = async (
  intent,
  channel,
  sender_username,
  intent_keys
) => {
  const best_intent = await get_best_matching_intent(intent, intent_keys);
  let response = "";

  if (best_intent && intentResponses[channel][best_intent]) {
    response = intentResponses[channel][best_intent].replace(
      "{{sender_username}}",
      sender_username
    );
  }

  return response;
};
