import { RemoteDataResult, failure, success } from "libs/remoteData"

export async function service<S = any, F = any>(request: RequestInfo | URL, init?: RequestInit): Promise<RemoteDataResult<S, F>> {
    try {
        const response = await fetch(request, init)
        if (response.ok) {
            return success(await response.json())
        } else {
            const errorDetails = await response.text()
            throw Error(`Request failure. Status: ${response.status}. Details: ${errorDetails}`)
        }
    } catch (err: any) {
        return failure(err.response ? err.response.data : err.message);
    }
}