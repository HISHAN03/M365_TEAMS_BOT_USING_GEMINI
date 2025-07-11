// weatherCard.js

function buildWeatherCard({ city, temperature, condition }) {
  return {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: `🌤️ Weather in ${city}`,
          weight: "Bolder",
          size: "Large"
        },
        {
          type: "TextBlock",
          text: `Temperature: ${temperature}°C`,
          wrap: true
        },
        {
          type: "TextBlock",
          text: `Condition: ${condition}`,
          wrap: true
        }
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json"
    }
  };
}

module.exports = { buildWeatherCard };
