import { MIDJOURNEY_EXPLANATION_SHORT} from "$lib/constants";
import {PROMPT_FILLER_EXPLANATION} from "$lib/constants.js";
import { error, json } from '@sveltejs/kit';


export async function POST({request, fetch}) {
  const { prompt_text, api_key, num_replies = 1 } = await request.json();

  if (!prompt_text || !api_key) {
    throw error(400, "Invalid request. Please provide prompt_text, personality_key, and api_key.");
  }

  try {
    const max_tokens = 700;
    const messages = [
      { role: "system", content: MIDJOURNEY_EXPLANATION_SHORT + " " + PROMPT_FILLER_EXPLANATION},
      { role: "user", content: `Give me ${num_replies} examples of: ${prompt_text}` },
    ];
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: max_tokens,
        n: 1,
        stop: null,
        temperature: 1.0,
      }),
    });
    const responseData = await response.json();
    if (responseData.error) {
      throw new Error(responseData.error.message)
    }
    // only one reply, but as a string separated by newlines. Make it an array.
    const reply = responseData.choices[0].message.content.trim();
    // First remove all text before the first /imagine prompt:
    const replyWithoutIntro = reply.substring(reply.indexOf("/imagine"));
    // Then split the string into an array of replies, separated by newlines:
    const replies = replyWithoutIntro.split("\n");
    return json({
      status: 200,
      replies: replies,
    });
  } catch (err) {
    console.error("Error generating prompt:", err);
    throw error(500, "Failed to generate prompt: " + err.message);

  }
}