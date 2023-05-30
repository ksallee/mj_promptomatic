<script>
  import { fade } from "svelte/transition";
  import {SyncLoader} from "svelte-loading-spinners";
  import Slider from '@bulatdashiev/svelte-slider';
  import { ESTIMATED_CHAR_LIMIT } from "$lib/constants";
  import Icon from "@iconify/svelte";
  import SvelteSeo from "svelte-seo";
  import { localStorageStore } from '$lib/localStorageStore';
  import {error} from "@sveltejs/kit";
  import { MIDJOURNEY_EXPLANATION_TINY} from "$lib/constants";
import {PROMPT_FILLER_EXPLANATION} from "$lib/constants.js";


  const apiKey = localStorageStore('apiKey', '');
  const instructions = localStorageStore('instructions', '');
  const nbResults = localStorageStore('nbResults', [1, 20]);
  const selectedPersonality = localStorageStore('selectedPersonality', 'photographer');
  const replies = localStorageStore('replies', []);

  let isLoading = false;
  let isIdeasLoading = false;
  let errorMessage = "";
  let isCopied = [];
  $:buttonText = $nbResults[0] > 1 ? "Generate Prompts" : "Generate Prompt";

  const personalities = [
    {
      key: "photographer",
      label: "Photographer",
      imgSrc: "photographer.png",
    },
    {
      key: "painter",
      label: "Painter",
      imgSrc: "painter.png",
    },
    {
      key: "fashion_designer",
      label: "Fashion Designer",
      imgSrc: "fashion_designer.png",
    },
    {
      key: "street_photographer",
      label: "Street Photographer",
      imgSrc: "street_photographer.png",
    },
    {
      key: "movie_concept_artist",
      label: "Movie Concept Artist",
      imgSrc: "movie_concept_artist.png",
    },
    {
      key: "graphic_designer",
      label: "Graphic Designer",
      imgSrc: "graphic_designer.png",
    },
    {
      key: "graphic_novel_artist",
      label: "Graphic Novel Artist",
      imgSrc: "graphic_novel_artist.png",
    },
    {
      key: "architect",
      label: "Architect",
      imgSrc: "architect.png",
    },
    // {
    //   key: "crazy_artist",
    //   label: "Crazy Artist",
    //   imgSrc: "crazy_artist.png",
    // }
    {
      key: "weight_master",
      label: "Weight Master",
      imgSrc: "weight_master.png",
    }

  ];
  async function handleSubmitIdea() {
    if (!$apiKey) {
      errorMessage = 'Please enter your API key.';
      return;
    }
    errorMessage = null;
    isIdeasLoading = true;
    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personality_key: $selectedPersonality,
          api_key: $apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error:", errorData)
        errorMessage = errorData.message || 'An unknown error occurred.';
      } else {
        const data = await response.json();
        $instructions = data.idea;
      }
    } catch (error) {
      console.error('Error:', error);
      errorMessage = 'Error: ' + error;
    }
    isIdeasLoading = false;
  }

  async function handleSubmit() {
    if (!$apiKey || !$instructions) {
      errorMessage = 'Please enter your API key and instructions.';
      return;
    }
    errorMessage = null;
    isLoading = true;
    try {
      const max_tokens = 400;
      const messages = [
        { role: "system", content: MIDJOURNEY_EXPLANATION_TINY + " " + PROMPT_FILLER_EXPLANATION},
        { role: "user", content: `Give me ${$nbResults[0]} examples of: ${$instructions}` },
      ];
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${$apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messages,
          max_tokens: max_tokens,
          n: 1,
          stop: null,
          temperature: 1.0,
          stream: true,
        }),
      });
      // Read the response as a stream of data
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      $replies = [];
      let reply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        // Massage and parse the chunk of data
        const chunk = decoder.decode(value);
        const lines = chunk.split("\\n");
        // this is what a line looks like:
        // {"id":"chatcmpl-7Lly9472ato9dwbVlFybPbvvW6sYa","object":"chat.completion.chunk","created":1685423637,"model":"gpt-3.5-turbo-0301","choices":[{"delta":{"content":"."},"index":0,"finish_reason":null}]}
        // JSON can be malformed, and we only care about "content":"." so we'll do some string parsing
        const parsedLines = lines
          .map(line => line.replace(/^data: /, "").trim())
          .filter(line => line !== "" && line !== "[DONE]")
          .map(line => {
              try {
                  let parsed = JSON.parse(line);
                  // if the parsed line has choices array and the first item has a 'content' property
                  if (parsed.choices && parsed.choices[0] && 'content' in parsed.choices[0].delta) {
                      return parsed.choices[0].delta.content;
                  }
              } catch (err) {
                  reply = reply.substring(reply.indexOf("prompt:"))
                  if (reply.length > 0){
                    {
                      // sometimes there's more than one reply, so we'll split them up
                      reply = "/imagine " + reply;
                      // Split by "/imagine prompt:"
                      let splitReplies = reply.split("/imagine prompt:").filter(str => str.length > 0);

                      // Add "/imagine prompt:" back to each reply
                      splitReplies = splitReplies.map(str => "/imagine prompt:" + str.trim());
                      let lastFiveInstructions = $instructions.slice(-5);
                      splitReplies = splitReplies.map(str => {
                        let index = str.lastIndexOf(lastFiveInstructions);
                        if(index !== -1) {
                          // + 5 is added to include the lastFiveInstructions in the substring
                          return str.substring(0, index + 5);
                        }
                        return str;
                      });
                      if (splitReplies.length > 0) {
                        for (const splitReply of splitReplies) {
                          if (splitReply != "" && splitReply != $replies[$replies.length - 1])
                            $replies = [...$replies, splitReply];
                        }
                      }
                    }
                  }
              }
              return null;
          })
          .filter(content => content !== null);  // Remove null items
        for (const parsedLine of parsedLines) {
          reply += parsedLine;
        }
      }
  }
  catch (err) {
    console.error("Error generating prompt:", err);
    errorMessage = 'Error: ' + error;
  }
    isLoading = false;
  }
  async function copyToClipboard(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      isCopied[index] = true;
      isCopied = [...isCopied];
      setTimeout(() => {
        isCopied[index] = false;
        isCopied = [...isCopied];
      }, 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
    }
  </style>
  <title>Midjourney ChatGPT prompt generator</title>
</svelte:head>
<SvelteSeo
    openGraph={{
    title: "Midjourney Prompt Generator",
    description: "Midjourney v5.1 Gpt 3.5 Turbo Prompt Generator",
    keywords: "Midjourney" +
      " OpenAI" +
      " GPT-3" +
      " gpt-3.5-Turbo" +
      " Midjourney Prompt Generator" +
      " Prompt Generator" +
      " Midjourney v5.1 Gpt 3.5 Turbo Prompt Generator" +
      " AI Prompt Generator" +
      " AI Prompt" +
      " AI Prompt Generator",
    canonical: "https://midjourney-prompt-generator.netlify.app",
    url: "https://midjourney-prompt-generator.netlify.app",
    type: 'website',
    images: [
      {
        url: "https://midjourney-prompt-generator.netlify.app/cover_seo_2.png",
        width: 1536,
        height: 768,
        alt: "An isometric factory making art. Midjourney Prompt Generator Cover Image",
      }
     ]
  }}
/>

<main>
  <div class="title">
    <img src="favicon.png" class="logo" alt="Midjourney Prompt Generator Logo" />
    <h1>
      Midjourney v5.1 GPT-3.5-Turbo Prompt Generator
    </h1>
  </div>


  <label for="api-key">OpenAI API Key:</label>
  <input
      type="text"
      id="api-key"
      bind:value="{$apiKey}"
      placeholder="Enter your OpenAI API key"
  />
  <p class="info">
    Get your API key from
    <a href="https://platform.openai.com/account/api-keys" target="_blank">OpenAI</a>.
  </p>
  <label for="personality">Personality:</label>
  <div class="personality-cards">
    {#each personalities as personality}
      <div
          class="personality-card {$selectedPersonality === personality.key ? 'selected' : ''}"
          on:click={() => ($selectedPersonality = personality.key)}
      >
        <img class="icon" src="{personality.imgSrc}" alt="{personality.label}" />
        <span class="perso-title">{personality.label}</span>
      </div>
    {/each}
  </div>
  <div class="instructions-header">
    <label class="instructions-label" for="instructions">Instructions:</label>
    <button class="instructionsButton" on:click={handleSubmitIdea} disabled="{!$apiKey || isIdeasLoading}">I'm lazy!</button>
    {#if isIdeasLoading}
    <div class="loading">
      <SyncLoader size="2.5" color="#5147a8" unit="rem" duration="0.5s"/>
    </div>
    {/if}
  </div>

  <textarea
      id="instructions"
      bind:value="{$instructions}"
      placeholder="Enter your instructions"
      maxlength="{ESTIMATED_CHAR_LIMIT}"
      rows="5"
  />

  <div class="numberResults">
    <label for="nb-results">Number of Results: {$nbResults[0]}</label>
    <Slider bind:value={$nbResults} min={1} max={20} step={1} />
  </div>


  <div class="submit">
    <button on:click="{handleSubmit}" disabled="{!$apiKey || isLoading}">
      {buttonText}
    </button>
  </div>


  {#if isLoading}
    <div class="loading">
      <SyncLoader size="2.5" color="#5147a8" unit="rem" duration="0.5s"/>
    </div>
  {/if}
  {#if errorMessage}
    <div class="error" transition:fade>{errorMessage}</div>
  {/if}
  {#if $replies && $replies.length > 0}
    <div class="results">
      {#each $replies as reply, index (reply + index)}
        <div class="result" transition:fade>
          <div class="result-content">
            <h3>Result {index + 1}:</h3>
            <p>{reply}</p>
          </div>
          <div class="result-icon">
            <button class="copy-button {isCopied[index] ? 'pushed' : ''}" on:click={() => copyToClipboard(reply, index)}>
              <Icon icon="lucide:clipboard-copy" width="24px" />
            </button>
            {#if isCopied[index]}
              <div class="tooltip">Copied!</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <footer>
    <p>
      This project was made using Svelte, with the help
      of ChatGPT 4 by OpenAI. Learn more about how it was created
      <a href="https://medium.com/@kevin.sallee/unleashing-creativity-with-ai-my-journey-with-chatgpt-4-and-midjourney-art-2fddd6f9271b" target="_blank">here</a>.
    </p>
  </footer>
</main>

<style>
  .instructions-header{
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .instructions-label{
    margin-bottom: 0;
  }
  .instructionsButton{
    margin: 0;
    padding: 7px 12px;
  }
  .logo{
    object-fit: cover;
    width: 45px;
  }

  .copy-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-button:focus {
    outline: none;
  }

  .numberResults{
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    width: 300px;
  }
  .lengthOptions{
    max-width: 200px;
    color: #222222;
  }
  .info{
    font-size: 12px;
    color: #aaa;
    margin-bottom: 1.5rem;
    margin-top: 0;
  }
  .error{
    color: red;
    margin-top: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .submit{
    display: flex;
    justify-content: center;
    align-items: center;
  }
  label{
    display: block;
    margin-bottom: 1rem;
    font-size: 16px;
  }
  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .title svg {
    width: 50px; /* Adjust the size according to your preference */
    height: auto;
    fill: #F9F9FC; /* Change the color to a lighter one */
  }
  :global(body) {
    margin: 0;
    background-color: #222;
    color: #F9F9FC;
  }

  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
  }

  h1 {
    text-align: center;
  }
  h1, h2, h3 {
    color: #eee;
    margin: .5rem 0;
  }

  input, textarea {
    width: 95%;
    padding: 0.5rem;
    border: none;
    border-radius: 5px;
    margin-bottom: 1rem;
    font-family: inherit;
    color: #333;
    background-color: #eee;
    resize: none;
    outline: none;
  }

  button {
    font-family: inherit;
    font-size: 16px;
    padding: 12px 20px;
    border: 2px solid #333;
    border-radius: 6px;
    background-color: white;
    cursor: pointer;
    outline: none;
    transition: all 0.3s ease;
  }
  button:hover {
    border-color: #555;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  button {
    margin-top: 16px;
    background-color: #5147a8;
    color: white;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 3rem;
  }

  .results {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1fr;
    grid-gap: 1rem;
  }

  .result {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    background-color: #414040;
    padding: .5rem;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }


  .result-content {
    padding-right: 1rem;
  }

  .result-icon {
    cursor: pointer;
    position: relative;
  }
  .result-icon.pushed {
    transform: translateY(2px);
    color: #5f5fff;
  }

  .tooltip {
    position: absolute;
    background-color: #555;
    color: #fff;
    text-align: center;
    border-radius: 4px;
    padding: 0.5rem;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    margin-top: 0.5rem;
  }

  .tooltip::after {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent #555 transparent;
  }



  footer {
    margin-top: 4rem;
    text-align: center;
  }

  a {
    color: #5f5fff;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
  .personality-cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: .4rem;
    margin-bottom: 2rem;
  }

  .personality-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100px;
    height: 120px;
    background-color: #f5f5f5;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.2s ease;
    gap: 5px;
    padding-top: 5px;
  }

  .personality-card:hover {
    transform: translateY(-4px);
  }

  .personality-card.selected {
    border: 3px solid #8888e0;
    box-shadow: 0 4px 6px rgba(83, 83, 187, 0.2);
    transform: scale(1.01);
  }

  .personality-card .icon {
    width: 100%;
    height: auto;
    max-height: 70%; /* You can adjust this value to limit the height of the image within the card */
    object-fit: contain;
  }

  .personality-card .perso-title {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    color: #333;
  }


  @media (max-width: 600px) {
    main {
      padding: 1rem 0.5rem;
    }
  }
</style>
