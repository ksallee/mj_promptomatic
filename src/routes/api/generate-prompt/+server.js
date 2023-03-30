import { MIDJOURNEY_EXPLANATION, PHOTOGRAPHER, PAINTER, CRAZY_ARTIST, FASHION_DESIGNER} from "$lib/constants";
import {STREET_PHOTOGRAPHER, ARCHITECT, MOVIE_CONCEPT_ARTIST, GRAPHIC_DESIGNER, GRAPHIC_NOVEL_ARTIST} from "$lib/constants.js";
import {MIDJOURNEY_PROMPT_SMALL, MIDJOURNEY_PROMPT_MEDIUM, MIDJOURNEY_PROMPT_LARGE, MIDJOURNEY_PROMPT_TINY} from "$lib/constants.js";
import { error, json } from '@sveltejs/kit';

const personalities = {
  photographer: PHOTOGRAPHER,
  painter: PAINTER,
  crazy_artist: CRAZY_ARTIST,
  fashion_designer: FASHION_DESIGNER,
  street_photographer: STREET_PHOTOGRAPHER,
  architect: ARCHITECT,
  movie_concept_artist: MOVIE_CONCEPT_ARTIST,
  graphic_designer: GRAPHIC_DESIGNER,
  graphic_novel_artist: GRAPHIC_NOVEL_ARTIST,

};

export async function POST({request, fetch}) {
  const { prompt_text, personality_key, api_key, prompt_length = "Medium", num_replies = 1 } = await request.json();
  const personality = personalities[personality_key];

  if (!prompt_text || !personality_key || !api_key) {
    throw error(400, "Invalid request. Please provide prompt_text, personality_key, and api_key.");
  }

  try {
    const max_tokens = 200;
    const prompt_length_texts = {
      "Tiny": MIDJOURNEY_PROMPT_TINY,
      "Small": MIDJOURNEY_PROMPT_SMALL,
      "Medium": MIDJOURNEY_PROMPT_MEDIUM,
      "Large": MIDJOURNEY_PROMPT_LARGE,
    }
    const prompt_length_text = prompt_length_texts[prompt_length];
    console.log("prompt_length_text", prompt_length_text);
    const messages = [
      { role: "system", content: `${MIDJOURNEY_EXPLANATION} ${prompt_length_text} ${personality}` },
      { role: "user", content: prompt_text },
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
        n: num_replies,
        stop: null,
        temperature: 0.7,
      }),
    });
    const responseData = await response.json();
    if (responseData.error) {
      throw new Error(responseData.error.message)
    }
    const replies = responseData.choices.map((choice) => choice.message.content.trim());
    console.log("replies", responseData);

    return json({
      status: 200,
      replies: replies,
    });
  } catch (err) {
    console.error("Error generating prompt:", err);
    throw error(500, "Failed to generate prompt: " + err.message);

  }
}