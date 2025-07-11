const { askGemini, classifyIntentWithGemini } = require("./geminiClient");
const { getJokeFromMCP } = require("./mcp");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const { ActivityTypes } = require("@microsoft/agents-activity");
const {AgentApplication,AttachmentDownloader,MemoryStorage} = require("@microsoft/agents-hosting");
const { version } = require("@microsoft/agents-hosting/package.json");

const downloader = new AttachmentDownloader();

// Define storage and application
const storage = new MemoryStorage();
const teamsBot = new AgentApplication({
  storage,
  fileDownloaders: [downloader],
});

// Listen for user to say '/reset' and then delete conversation state
teamsBot.onMessage("/reset", async (context, state) => {
  state.deleteConversationState();
  await context.sendActivity("Ok I've deleted the current conversation state.");
});

teamsBot.onMessage("/count", async (context, state) => {
  const count = state.conversation.count ?? 0;
  await context.sendActivity(`The count is ${count}`);
});

teamsBot.onMessage("/diag", async (context, state) => {
  await state.load(context, storage);
  await context.sendActivity(JSON.stringify(context.activity));
});

teamsBot.onMessage("/state", async (context, state) => {
  await state.load(context, storage);
  await context.sendActivity(JSON.stringify(state));
});

teamsBot.onMessage("/runtime", async (context, state) => {
  const runtime = {
    nodeversion: process.version,
    sdkversion: version,
  };
  await context.sendActivity(JSON.stringify(runtime));
});

teamsBot.onConversationUpdate("membersAdded", async (context, state) => {
  await context.sendActivity(
    `Hi there! I'm an echo bot running on Agents SDK version ${version} that will echo what you said to me.`
  );
});

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS

// teamsBot.activity(ActivityTypes.Message, async (context, state) => {

//   let count = state.conversation.count ?? 0;
//   state.conversation.count = ++count;

//   await context.sendActivity(`[${count}] you said: ${context.activity.text}`);
// });

// teamsBot.activity(ActivityTypes.Message, async (context, state) => {
//   const userMessage = context.activity.text;
//   try {
//     const geminiResponse = await askGemini(userMessage);
//     await context.sendActivity(geminiResponse);
//   } catch (error) {
//     console.error("Gemini API Error:", error);
//     await context.sendActivity("Sorry, something went wrong when contacting Gemini.");
//   }
// });

teamsBot.onActivity(ActivityTypes.Message, async (context, state) => {
  const userMessage = context.activity.text;
  try {
    const action = await classifyIntentWithGemini(userMessage);

    if (action.startsWith("action:weather")) {
      const location = action.split("location:")[1]?.trim();

      if (!location) {
        await context.sendActivity("❌ Please specify a location.");
        return;
      }

      // Fetch weather
      const weather = await getWeatherFor(location);
      await context.sendActivity(weather);
    } else if (action.startsWith("action:joke")) {
      const typeMatch = action.match(/type:([^\s]+)/);
      const tool = typeMatch?.[1] || null;
      const methodMatch = action.match(/method:([^\s]+)/);
      const method = methodMatch?.[1] ?? null;
      const uri = action.split("uri:")[1]?.trim();
      console.log("tool " + tool, "method " + method, "uri " + uri);
      const joke = await getJokeFromMCP(tool, method, uri);
      console.log("INPUT:", joke);

      const formattedOutput = await askGemini(`
          You are a formatter for Microsoft Teams chat.

          Your task is to cleanly format any input text or data you receive.

          Rules:
          1. If the input is human-readable plain text, just clean it up with punctuation and line breaks if needed.
          2. If the input appears to be JSON (e.g., starts with { or [), parse and format it into a readable markdown list:
             - For each item, show:
               - **Name**: value
               - **Email**: value
               - **Role**: value
          3. If the input is not valid or doesn't match either format, simply return "No readable content available."
          
          Input:
          \`\`\`
          ${joke}
          \`\`\`
          `);

      console.log("Formatted Output:", formattedOutput);
      return await context.sendActivity(formattedOutput);

      //return await context.sendActivity(joke);
    } 



    else if (action.startsWith("action:prompt")) {
  console.log("🟡 Processing action:prompt for prompts/get");

  // 🔍 Extract prompt type (e.g., analyze, summarize)
  const typeMatch = action.match(/type:([^\s]+)/);
   const promptName='explain-code';

  // 🔍 Extract optional parameters (language, etc.)
  const textMatch = action.match(/text:\((.*?)\)/);
  const textArgs = textMatch?.[1] ?? "";
  const argPairs = textArgs.split(",").reduce((acc, item) => {
    const [key, val] = item.split(":");
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
  }, {});

  const language = argPairs.language || "plaintext";

  // 🧠 Extract code from message (with markdown & fallback)
  let rawCode =
    context.activity.text.match(/```(?:\w*\n)?([\s\S]*?)```/)?.[1] || // inside code block
    context.activity.text.match(/(?:code[:\s]*)([\s\S]*)/i)?.[1] || 
    "";

  rawCode = rawCode.trim().replace(/^(\w+)\n/, "").trim(); // remove language marker (e.g., "python\n")

  // if (!promptName) {
  //   return await context.sendActivity("❌ Prompt name missing in action.");
  // }



  console.log("Prompt name:", promptName);
  console.log("Language:", language);
  console.log("Raw Code:", rawCode || "⚠️ NO CODE FOUND");

  // 🔁 Call MCP to get prompt template
  const mcpResponse = await getJokeFromMCP(promptName, "prompts/get", null, {
    code: rawCode,
    language: language,
  });

const promptMessages = mcpResponse.result?.messages || [];
console.log("Prompt Messages:", promptMessages);

  // if (!promptMessages.length) {
  //   return await context.sendActivity("❌ Could not load prompt template.");
  // }

  // 🧩 Replace ${code} and ${language} in prompt
  const finalPrompt = promptMessages.map((msg) => {
    const originalText = msg.content?.text || "";
    const filledText = originalText
      .replace(/\$\{code\}/g, rawCode || "NO_CODE_PROVIDED")
      .replace(/\$\{language\}/g, language);

    return {
      role: msg.role,
      parts: [{ text: filledText }],
    };
  });

  console.log("📤 Final Prompt to Gemini:", finalPrompt);

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const geminiResponse = await model.generateContent({ contents: finalPrompt });
  const finalText = await geminiResponse.response.text();

  return await context.sendActivity(finalText);
}



 else {
      const reply = await askGemini(userMessage);
      await context.sendActivity(reply);
    }
  } catch (err) {
    console.error(err);
    await context.sendActivity("❌ Sorry, something went wrong.");
  }
});

async function getWeatherFor(city) {
  const apiKey = "d97adacaed1b1ad9122d0f7a41af47ab";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  try {
    const { data } = await axios.get(url);
    return `🌤️ Weather in ${data.name}:
   
Temperature: ${data.main.temp}°C
Condition: ${data.weather[0].description}`;
  } catch (err) {
    console.error("Weather error:", err.response?.data || err.message);
    return `Sorry, I couldn't find the weather for "${city}".`;
  }
}

teamsBot.onActivity(/^message/, async (context, state) => {
  await context.sendActivity(`Matched with regex: ${context.activity.type}`);
});

teamsBot.onActivity(
  async (context) => Promise.resolve(context.activity.type === "message"),
  async (context, state) => {
    await context.sendActivity(`Matched function: ${context.activity.type}`);
  }
);

module.exports.teamsBot = teamsBot;
