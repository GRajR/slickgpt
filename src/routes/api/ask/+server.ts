import type { Config } from '@sveltejs/adapter-vercel';
import type { ChatCompletionRequestMessage, CreateChatCompletionRequest } from 'openai';
import type { RequestHandler } from './$types';
import type { OpenAiSettings } from '$misc/openai';
import { error } from '@sveltejs/kit';
import { getErrorMessage, throwIfUnset } from '$misc/error';
import { OpenAiModel } from '$misc/openai';
import axios from 'axios';

// this tells Vercel to run this function as https://vercel.com/docs/concepts/functions/edge-functions
export const config: Config = {
	runtime: 'edge'
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const requestData = await request.json();

		// console.log(`OpenAI API request object ${requestData}`);

		throwIfUnset('request data', requestData);

		const messages: ChatCompletionRequestMessage[] = requestData.messages;
		throwIfUnset('messages', messages);

		const settings: OpenAiSettings = requestData.settings;
		throwIfUnset('settings', settings);

		const openAiKey: string = requestData.openAiKey;
		throwIfUnset('OpenAI API key', openAiKey);

		const completionOpts: CreateChatCompletionRequest = {
			...settings,
			messages,
			stream: true
		};

		// const apiUrl = 'https://api.openai.com/v1/chat/completions';
		const isDaVinci = (settings.model === OpenAiModel.DaVinci);
		const apiUrl = isDaVinci ? 'https://api.openai.com/v1/completions' : 'https://api.openai.com/v1/chat/completions';
		const body = isDaVinci ? {
			"prompt": messages[messages.length - 1].content,
			...settings,
			"stream": true,
		} : completionOpts;

		// console.log('OpenAI body being sent === ',apiUrl,  body);

		try {
			const response = await axios.post(apiUrl, body, {
				headers: {
					Authorization: `Bearer ${openAiKey}`,
					'Content-Type': 'application/json'	
				}
			});
			// console.log('OpenAI API response', response.data);

			return new Response(response.data, {
				headers: {
					'Content-Type': 'text/event-stream'
				}
			});	
		}
		catch (err) {
			console.log('OpenAI API error', err);
			throw err;
		}
	} catch (err) {
		throw error(500, getErrorMessage(err));
	}
};
