import { type AxiosRequestConfig } from 'axios';
import { Bundle, Reference, Resource, ValueSet } from 'fhir/r4b';
import { SearchParams } from 'services/search';

import { RemoteDataResult, RequestService, failure, isFailure, success } from '@beda.software/remote-data';

import { WithId, extractBundleResources } from '.';
import {
    NullableRecursivePartial,
    create,
    forceDelete,
    get,
    list,
    markAsDeleted,
    patch,
    save,
    transformToBundleEntry,
    update,
} from './apiConfigs';
import { parseFHIRReference, cleanObject } from '../../utils/fhir';

export async function createFHIRResource<R extends Resource>(
    service: RequestService,
    resource: R,
    searchParams?: SearchParams,
    needToCleanResource = true
): Promise<RemoteDataResult<WithId<R>>> {
    let cleanedResource = resource;
    if (needToCleanResource) {
        cleanedResource = cleanObject(cleanedResource);
    }

    return service(create(cleanedResource, searchParams));
}

export async function updateFHIRResource<R extends Resource>(
    service: RequestService,
    resource: R,
    searchParams?: SearchParams,
    needToCleanResource = true
): Promise<RemoteDataResult<WithId<R>>> {
    let cleanedResource = resource;
    if (needToCleanResource) {
        cleanedResource = cleanObject(cleanedResource);
    }

    return service(update(cleanedResource, searchParams));
}

export async function getFHIRResource<R extends Resource>(
    service: RequestService,
    reference: Reference
): Promise<RemoteDataResult<WithId<R>>> {
    return service(get(reference));
}

export async function getFHIRResources<R extends Resource>(
    service: RequestService,
    resourceType: R['resourceType'],
    searchParams: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<Bundle<WithId<R>>>> {
    return service(list(resourceType, searchParams, extraPath));
}

export async function getAllFHIRResources<R extends Resource>(
    service: RequestService,
    resourceType: string,
    params: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<Bundle<WithId<R>>>> {
    const resultBundleResponse = await getFHIRResources<R>(service, resourceType, params, extraPath);

    if (isFailure(resultBundleResponse)) {
        return resultBundleResponse;
    }

    let resultBundle = resultBundleResponse.data;

    while (true) {
        let nextLink = resultBundle.link?.find((link) => {
            return link.relation === 'next';
        });

        if (!nextLink) {
            break;
        }

        const response = await service({
            method: 'GET',
            url: nextLink.url,
        });

        if (isFailure(response)) {
            return response;
        }

        resultBundle = {
            ...response.data,
            entry: [...resultBundle.entry!, ...response.data.entry],
        };
    }

    return success(resultBundle);
}

export async function findFHIRResource<R extends Resource>(
    service: RequestService,
    resourceType: R['resourceType'],
    params: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<WithId<R>>> {
    const response = await getFHIRResources<R>(service, resourceType, params, extraPath);

    if (isFailure(response)) {
        return response;
    }

    const resources = extractBundleResources(response.data)[resourceType] as WithId<R>[];

    if (resources.length === 1) {
        return success(resources[0]);
    } else if (resources.length === 0) {
        return failure({ error_description: 'No resources found', error: 'no_resources_found' });
    } else {
        return failure({
            error_description: 'Too many resources found',
            error: 'too_many_resources_found',
        });
    }
}

export async function saveFHIRResource<R extends Resource>(
    service: RequestService,
    resource: R,
    needToCleanResource = true
): Promise<RemoteDataResult<WithId<R>>> {
    let cleanedResource = resource;
    if (needToCleanResource) {
        cleanedResource = cleanObject(cleanedResource);
    }

    return service(save(cleanedResource));
}

export async function saveFHIRResources<R extends Resource>(
    service: RequestService,
    resources: R[],
    bundleType: 'transaction' | 'batch',
    needToCleanResource = true
): Promise<RemoteDataResult<Bundle<WithId<R>>>> {
    return service({
        method: 'POST',
        url: '/',
        data: {
            resourceType: 'Bundle',
            type: bundleType,
            entry: resources.map((resource) => {
                let cleanedResource = resource;
                if (needToCleanResource) {
                    cleanedResource = cleanObject(cleanedResource);
                }
                const versionId = cleanedResource.meta && cleanedResource.meta.versionId;

                return {
                    resource: cleanedResource,
                    request: {
                        method: cleanedResource.id ? 'PUT' : 'POST',
                        url: `/${cleanedResource.resourceType}${cleanedResource.id ? '/' + cleanedResource.id : ''}`,
                        ...(cleanedResource.id && versionId ? { ifMatch: versionId } : {}),
                    },
                };
            }),
        },
    });
}

export async function patchFHIRResource<R extends Resource>(
    service: RequestService,
    resource: NullableRecursivePartial<R>,
    searchParams?: SearchParams
): Promise<RemoteDataResult<WithId<R>>> {
    return service(patch(resource, searchParams));
}

export async function deleteFHIRResource<R extends Resource>(
    service: RequestService,
    resource: Reference
): Promise<RemoteDataResult<WithId<R>>> {
    return service(markAsDeleted(resource));
}

export async function forceDeleteFHIRResource<R extends Resource>(
    service: RequestService,
    resource: Reference
): Promise<RemoteDataResult<WithId<R>>> {
    const reference = parseFHIRReference(resource)!;

    if (!reference.resourceType) {
        throw new Error(`resourceType is missing from ${reference}`);
    }

    return service(forceDelete(reference.resourceType, reference.id));
}

export async function applyFHIRServices<T extends Resource, F = any>(
    service: RequestService,
    requests: Array<AxiosRequestConfig>,
    type: 'transaction' | 'batch' = 'transaction'
): Promise<RemoteDataResult<Bundle<WithId<T>>, F>> {
    return service<Bundle<WithId<T>>, F>({
        method: 'POST',
        url: '/',
        data: {
            type,
            entry: requests.map(transformToBundleEntry).filter((entry) => entry !== null),
        },
    });
}

export async function applyFHIRService<T extends Resource, F = any>(
    service: RequestService,
    request: AxiosRequestConfig
): Promise<RemoteDataResult<WithId<T>, F>> {
    return service<WithId<T>, F>(request);
}

export function getConcepts(
    service: RequestService,
    valueSetId: string,
    params?: SearchParams
): Promise<RemoteDataResult<ValueSet>> {
    return service({
        method: 'GET',
        url: `/ValueSet/${valueSetId}/$expand`,
        params: { ...params },
    });
}
