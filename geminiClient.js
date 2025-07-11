require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// async function classifyIntentWithGemini(userMessage) {
//   const model = genAI.getGenerativeModel({
//     model: "gemini-2.0-flash",
//     stream: true,
//   });
//   const prompt = `
// You are an intent router. If user asks for weather, reply:
// action:weather location:<city>
// Otherwise reply:
// action:general

// Q: ${userMessage}
// A:
//   `;
//   const result = await model.generateContent(prompt);
//   console.log(result.response.text().trim());
//   return result.response.text().trim();
// }

async function classifyIntentWithGemini(userMessage) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    stream: true,
  });

  const prompt = `
You are an intent router.

Return one of the following responses based on user input:
- If the user asks about the weather in any location, respond like:
  action:weather location:<city>
- If the user asks for a joke, respond:
  action:joke type:get-chuck-joke-by-category method:tools/call
- If the user asks for a chuck norris joke, respond:
  action:joke type:get-chuck-joke method:tools/call
- If the user asks about agentic ai team, respond:
  action:joke  method:resources/read uri:muadh://users
- If the user asks to list the prompts or anything related to tell me the available prompts or what builf in prompts do u have  , respond:
  action:prompt  method:prompts/list

If the user says "use this prompt" or refers to built-in prompt names like "analyze code" or "summarize",
  - and provides some code,
  - then respond with:

action:prompt type:<prompt-name> method:prompts/get text:(language:<detected-language>, code:<the-code>)

- For any other general questions or requests, respond:
  action:general

Examples:
Q: What's the weather in Paris?
A: action:weather location:Paris

Q: Tell me a joke.
A: action:joke type:get-chuck-categories

Q: Tell me a chuck norris joke.
A: action:joke type:get-chuck-joke

Q: Who is the CEO of Microsoft?
A: action:general

Now classify this:
Q: ${userMessage}
A:
  `;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim();
  console.log("Gemini Intent Classification:", response);
  //console.log("Gemini Intent Classification:", result);

  console.log("Gemini Intent Response:", response);
  return response;
}

// - If the user says use this prompt and provides a prompt name 
//   (so currenty only two prompts are there if user says something related to analyze code or help me summarize this then set tool:analyze-code and he will have given code identify which language it is then respond), respond:
//   action:prompt type:explain-code method:prompts/get  data:{identify the code given by the user and pass the whole code} language:identify the language used in the code

async function askGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

module.exports = { askGemini, classifyIntentWithGemini };
