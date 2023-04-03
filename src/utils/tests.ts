import { isFailure, isSuccess, RemoteData } from '../libs/remoteData';
import { axiosInstance } from '../services/instance';

export async function withRootAccess<R>(fn: () => Promise<R>) {
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
