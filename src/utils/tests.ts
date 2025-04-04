import { type AxiosInstance } from 'axios';

import { RemoteData, isFailure, isSuccess } from '@beda.software/remote-data';

export async function withRootAccess<R>(axiosInstance: AxiosInstance, fn: () => Promise<R>) {
    axiosInstance.defaults.auth = {
        username: 'root',
        password: 'secret',
    };
    try {
        return await fn();
    } finally {
        delete axiosInstance.defaults.auth;
    }
}

export function ensure<R>(result: RemoteData<R>): R {
    if (isSuccess(result)) {
        return result.data;
    }
    throw new Error(`Network error ${JSON.stringify(result)}`);
}

export function investigate<R = any>(result: RemoteData<unknown, R>): R {
    if (isFailure(result)) {
        return result.error;
    }
    throw new Error(`Nothing to investigate for ${JSON.stringify(result)}`);
}
