import { IDEA_GENERATOR_EXPLANATION,  } from "$lib/constants";
import { error, json } from '@sveltejs/kit';
import {MIDJOURNEY_EXPLANATION_TINY} from "$lib/constants";
import {
  IDEA_GENERATOR_PHOTOGRAPHER,
  IDEA_GENERATOR_PAINTER,
  // IDEA_GENERATOR_CRAZY_ARTIST,
  IDEA_GENERATOR_FASHION_DESIGNER,
  IDEA_GENERATOR_STREET_PHOTOGRAPHER,
  IDEA_GENERATOR_ARCHITECT,
  IDEA_GENERATOR_MOVIE_CONCEPT_ARTIST,
  IDEA_GENERATOR_GRAPHIC_DESIGNER,
  IDEA_GENERATOR_GRAPHIC_NOVEL_ARTIST,
} from "$lib/constants.js";


const personalities = {
  photographer: IDEA_GENERATOR_PHOTOGRAPHER,
  painter: IDEA_GENERATOR_PAINTER,
  // crazy_artist: IDEA_GENERATOR_CRAZY_ARTIST,
  fashion_designer: IDEA_GENERATOR_FASHION_DESIGNER,
  street_photographer: IDEA_GENERATOR_STREET_PHOTOGRAPHER,
  architect: IDEA_GENERATOR_ARCHITECT,
  movie_concept_artist: IDEA_GENERATOR_MOVIE_CONCEPT_ARTIST,
  graphic_designer: IDEA_GENERATOR_GRAPHIC_DESIGNER,
  graphic_novel_artist: IDEA_GENERATOR_GRAPHIC_NOVEL_ARTIST,
  weight_master: IDEA_GENERATOR_PHOTOGRAPHER

};

export async function POST({request, fetch}) {
  const { personality_key, api_key } = await request.json();
  const personality = personalities[personality_key];

  if ( !personality_key || !api_key) {
    throw error(400, "Invalid request. Please provide prompt_text, personality_key, and api_key.");
  }

  try {
    const max_tokens = 50;
    const messages = [
      { role: "system", content: personality},
      { role: "system", content: IDEA_GENERATOR_EXPLANATION},
      { role: "user", content: "Give me a creative idea"},
    ];

    const data = JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: max_tokens,
        n: 1,
        stop: null,
        temperature: 1,
      });
    console.log("DATA", data);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${api_key}`,
      },
      body: data,
    });
    const responseData = await response.json();
    if (responseData.error) {
      throw new Error(responseData.error.message)
    }
    const replies = responseData.choices.map((choice) => choice.message.content.trim());

    return json({
      status: 200,
      idea: replies[0],
    });
  } catch (err) {
    console.error("Error generating idea:", err);
    throw error(500, "Failed to generate idea: " + err.message);

  }
}