import { APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';

export const mediumFeed = async (
	event: APIGatewayProxyResult
): Promise<APIGatewayProxyResult> => {
	const response = await axios.get('https://medium.com/feed/@robertbulmer');
	return {
		statusCode: 200,
		body: JSON.stringify(response.data),
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': '*',
			'Content-Type': 'application/json',
		},
	};
};
