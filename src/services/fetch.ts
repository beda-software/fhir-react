import { RemoteDataResult, failure, success } from '../libs/remoteData';

export interface FetchError {
    message: string;
    status?: number;
}

export async function service<S = any>(
    request: RequestInfo | URL,
    init?: RequestInit
): Promise<RemoteDataResult<S, FetchError>> {
    try {
        const response = await fetch(request, init);
        if (response.ok) {
            return success(await response.json());
        } else {
            return failure<FetchError>({ message: await response.text(), status: response.status });
        }
    } catch (err) {
        if (err instanceof Error) {
            return failure({ message: err.message });
        }

        return failure({ message: 'Unknown error' });
    }
}
