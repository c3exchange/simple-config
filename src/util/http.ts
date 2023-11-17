import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

// -----------------------------------------------------------------------------

export const getAxiosClient = (): AxiosInstance => {
	const client = axios.create()
	axiosRetry(client, {
		retries: 5,
		retryDelay: (retryCount) => {
			return retryCount * 200;
		}
	});
	return client;
};
