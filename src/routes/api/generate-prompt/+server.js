import { MIDJOURNEY_EXPLANATION_TINY} from "$lib/constants";
import {PROMPT_FILLER_EXPLANATION} from "$lib/constants.js";
import { error, json } from '@sveltejs/kit';


export async function POST({request, fetch}) {
  const { prompt_text, api_key, num_replies = 1 } = await request.json();

