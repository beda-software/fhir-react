import { RemoteDataResult, failure, success } from "../libs/remoteData"

export async function service<S = any, F = any>(request: RequestInfo | URL, init?: RequestInit): Promise<RemoteDataResult<S, F>> {
    try {
        const response = await fetch(request, init)
        if (response.ok) {
            return success(await response.json())
        } else {
            return failure(await response.text() as any)
        }
    } catch (err: any) {
        return failure(err.message);
    }
}