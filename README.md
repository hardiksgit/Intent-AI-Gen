# lambda-file-processor

## Features

This lambda function gets triggered on the s3 event, which further reads the uploaded file and parses the messages. It uses OpenAI gpt-3.5-turbo model to find the intents from the messages. I recommend checking the credits on your openai free account before running, otherwise paid plan won't be a problem. After generating intents, it utilizes the huggingface AI model to match the best intent and build the response incluing the sender's username. The function stores all the data to mongodb.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/hardiksgit/lambda-file-processor.git
cd lambda-file-processor
```

### 2. Install Dependancies

```bash
npm install
```

### 4. Configure the Environment Variables in AWS lambda

```bash
HUGGINGFACE_API_KEY=""
MONGODB_URI=""
OPENAI_API_KEY=""
```

### 5: Create iam role and policies for lambda and allow getObject operation. Attach the same to lambda.

I recommend increasing RPM in openai API settings for larger csv files.
