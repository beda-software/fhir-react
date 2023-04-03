import { AxiosRequestConfig } from 'axios';
import { Reference, Resource, ValueSet, Bundle, BundleEntry, BundleEntryRequest } from 'fhir/r4b';

import { isFailure, RemoteDataResult, success, failure } from '../libs/remoteData';
import { parseFHIRReference } from '../utils/fhir';
import { buildQueryParams } from './instance';
import { SearchParams } from './search';
import { service } from './service';

interface InactiveMappingItem {
    searchField: string;
    statusField: string;
    value: any;
}

interface InactiveMapping {
    [resourceType: string]: InactiveMappingItem;
}

// This type-wrapper is used to wrap Resource to make `id` attr required
// It's needed when we make requests to the FHIR server - initially all resources
// have id non-mandatory, but after request (GET/POST etc) the returned resource always
// has id.
export type WithId<T extends Resource> = T & Required<Pick<T, 'id'>>;

const inactiveMapping: InactiveMapping = {
    DocumentReference: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    Observation: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    Location: {
        searchField: 'status',
        statusField: 'status',
        value: 'inactive',
    },
    Schedule: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    Slot: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    Practitioner: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    Patient: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    User: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    Note: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    EpisodeOfCare: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
};

function isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
}

function getInactiveSearchParam(resourceType: string) {
    const item = inactiveMapping[resourceType];

    if (item) {
        return {
            [`${item.searchField}:not`]: [item.value],
        };
    }

    return {};
}

export async function createFHIRResource<R extends Resource>(
    resource: R,
    searchParams?: SearchParams
): Promise<RemoteDataResult<WithId<R>>> {
    return service(create(resource, searchParams));
}

export function create<R extends Resource>(resource: R, searchParams?: SearchParams): FhirAxiosRequestConfig {
    return {
        method: 'POST',
        url: `/${resource.resourceType}`,
        params: searchParams,
        data: resource,
    };
}

export async function updateFHIRResource<R extends Resource>(
    resource: R,
    searchParams?: SearchParams
): Promise<RemoteDataResult<WithId<R>>> {
    return service(update(resource, searchParams));
}

export function update<R extends Resource>(resource: R, searchParams?: SearchParams): FhirAxiosRequestConfig {
    if (searchParams) {
        return {
            method: 'PUT',
            url: `/${resource.resourceType}`,
            data: resource,
            params: searchParams,
        };
    }

    if (resource.id) {
        const versionId = resource.meta && resource.meta.versionId;

        return {
            method: 'PUT',
            url: `/${resource.resourceType}/${resource.id}`,
            data: resource,
            ...(versionId ? { headers: { 'If-Match': versionId } } : {}),
        };
    }

    throw new Error('Resourse id and search parameters are not specified');
}

export async function getFHIRResource<R extends Resource>(reference: Reference): Promise<RemoteDataResult<WithId<R>>> {
    return service(get(reference));
}

export function get(reference: Reference): FhirAxiosRequestConfig {
    return {
        method: 'GET',
        url: `/${reference.reference}`,
    };
}

export async function getFHIRResources<R extends Resource>(
    resourceType: R['resourceType'],
    searchParams: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<Bundle<WithId<R>>>> {
    return service(list(resourceType, searchParams, extraPath));
}

export async function getAllFHIRResources<R extends Resource>(
    resourceType: string,
    params: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<Bundle<WithId<R>>>> {
    const resultBundleResponse = await getFHIRResources<R>(resourceType, params, extraPath);

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

export function list<R extends Resource>(
    resourceType: R['resourceType'],
    searchParams: SearchParams,
    extraPath?: string
): FhirAxiosRequestConfig {
    return {
        method: 'GET',
        url: extraPath ? `/${resourceType}/${extraPath}` : `/${resourceType}`,
        params: { ...searchParams, ...getInactiveSearchParam(resourceType) },
    };
}

export async function findFHIRResource<R extends Resource>(
    resourceType: R['resourceType'],
    params: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<WithId<R>>> {
    const response = await getFHIRResources<R>(resourceType, params, extraPath);

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

export async function saveFHIRResource<R extends Resource>(resource: R): Promise<RemoteDataResult<WithId<R>>> {
    return service(save(resource));
}

export function save<R extends Resource>(resource: R): FhirAxiosRequestConfig {
    const versionId = resource.meta && resource.meta.versionId;

    return {
        method: resource.id ? 'PUT' : 'POST',
        data: resource,
        url: `/${resource.resourceType}${resource.id ? '/' + resource.id : ''}`,
        ...(resource.id && versionId ? { headers: { 'If-Match': versionId } } : {}),
    };
}

export async function saveFHIRResources<R extends Resource>(
    resources: R[],
    bundleType: 'transaction' | 'batch'
): Promise<RemoteDataResult<Bundle<WithId<R>>>> {
    return service({
        method: 'POST',
        url: '/',
        data: {
            type: bundleType,
            entry: resources.map((resource) => {
                const versionId = resource.meta && resource.meta.versionId;

                return {
                    resource,
                    request: {
                        method: resource.id ? 'PUT' : 'POST',
                        url: `/${resource.resourceType}${resource.id ? '/' + resource.id : ''}`,
                        ...(resource.id && versionId ? { ifMatch: versionId } : {}),
                    },
                };
            }),
        },
    });
}

type NullableRecursivePartial<T> = {
    [P in keyof T]?: NullableRecursivePartial<T[P]> | null;
};

export async function patchFHIRResource<R extends Resource>(
    resource: NullableRecursivePartial<R>,
    searchParams?: SearchParams
): Promise<RemoteDataResult<WithId<R>>> {
    return service(patch(resource, searchParams));
}

export function patch<R extends Resource>(
    resource: NullableRecursivePartial<R>,
    searchParams?: SearchParams
): FhirAxiosRequestConfig {
    if (searchParams) {
        return {
            method: 'PATCH',
            url: `/${resource.resourceType}`,
            data: resource,
            params: searchParams,
        };
    }

    if (resource.id) {
        return {
            method: 'PATCH',
            url: `/${resource.resourceType}/${resource.id}`,
            data: resource,
        };
    }

    throw new Error('Resourse id and search parameters are not specified');
}

export async function deleteFHIRResource<R extends Resource>(
    resource: Reference
): Promise<RemoteDataResult<WithId<R>>> {
    return service(markAsDeleted(resource));
}

export function markAsDeleted(reference: Reference): FhirAxiosRequestConfig {
    const { resourceType, id } = parseFHIRReference(reference)!;

    if (!resourceType) {
        throw new Error(`resourceType is missing from ${reference}`);
    }

    const inactiveMappingItem = inactiveMapping[resourceType];

    if (!inactiveMappingItem) {
        throw new Error(`Specify inactiveMapping for ${resourceType} to mark item deleted`);
    }

    return {
        method: 'PATCH',
        url: `/${resourceType}/${id}`,
        data: {
            [inactiveMappingItem.statusField]: inactiveMappingItem.value,
        },
    };
}

export async function forceDeleteFHIRResource<R extends Resource>(
    resource: Reference
): Promise<RemoteDataResult<WithId<R>>> {
    const reference = parseFHIRReference(resource)!;

    if (!reference.resourceType) {
        throw new Error(`resourceType is missing from ${reference}`);
    }

    return service(forceDelete(reference.resourceType, reference.id));
}

export function forceDelete<R extends Resource>(
    resourceType: R['resourceType'],
    idOrSearchParams: string | SearchParams
): FhirAxiosRequestConfig {
    if (isObject(idOrSearchParams)) {
        return {
            method: 'DELETE',
            url: `/${resourceType}`,
            params: idOrSearchParams,
        };
    }

    return {
        method: 'DELETE',
        url: `/${resourceType}/${idOrSearchParams}`,
    };
}

export function getReference<T extends Resource>(resource: T, display?: string): Reference {
    return {
        reference: `${resource.resourceType}/${resource.id!}`,
        ...(display ? { display } : {}),
    };
}

export function makeReference(resourceType: string, id: string, display?: string): Reference {
    return {
        reference: `${resourceType}/${id}`,
        ...(display ? { display } : {}),
    };
}

export function isReference<T extends Resource>(resource: T | Reference): resource is Reference {
    return !Object.keys(resource).filter(
        (attribute) => ['reference', 'display', 'identifier', 'type', 'extension'].indexOf(attribute) === -1
    ).length;
}

export type ResourcesMap<T extends Resource> = {
    [P in T['resourceType']]: T extends { resourceType: P } ? T[] : never;
};

export function extractBundleResources<T extends Resource>(bundle: Bundle<T>): ResourcesMap<T> {
    const entriesByResourceType = {} as ResourcesMap<T>;
    const entries = bundle.entry || [];
    entries.forEach(function(entry) {
        const type = entry.resource!.resourceType;
        if (!entriesByResourceType[type]) {
            entriesByResourceType[type] = [];
        }
        entriesByResourceType[type].push(entry.resource);
    });

    return new Proxy(entriesByResourceType, {
        get: (obj, prop) => (obj.hasOwnProperty(prop) ? obj[prop] : []),
    });
}

export function getIncludedResource<T extends Resource>(
    // TODO: improve type for includedResources: must contain T
    resources: ResourcesMap<T | any>,
    reference: Reference
): T | undefined {
    const { resourceType, id } = parseFHIRReference(reference);

    if (!resourceType) {
        return undefined;
    }

    const typeResources = resources[resourceType];
    if (!typeResources) {
        return undefined;
    }
    const index = typeResources.findIndex((resource: T) => resource.id === id);
    return typeResources[index];
}

export function getIncludedResources<T extends Resource>(
    // TODO: improve type for includedResources: must contain T
    resources: ResourcesMap<T | any>,
    resourceType: T['resourceType']
): T[] {
    return (resources[resourceType] || []) as T[];
}

export function getMainResources<T extends Resource>(bundle: Bundle<T>, resourceType: T['resourceType']): T[] {
    if (!bundle.entry) {
        return [];
    }

    return bundle.entry
        .filter((entry) => entry.resource?.resourceType === resourceType)
        .map((entry) => entry.resource!);
}

export function getConcepts(valueSetId: string, params?: SearchParams): Promise<RemoteDataResult<ValueSet>> {
    return service({
        method: 'GET',
        url: `/ValueSet/${valueSetId}/$expand`,
        params: { ...params },
    });
}

export async function applyFHIRService<T extends Resource, F = any>(
    request: FhirAxiosRequestConfig
): Promise<RemoteDataResult<WithId<T>, F>> {
    return service<WithId<T>, F>(request);
}

const toCamelCase = (str: string): string => {
    const withFirstLowerLetter = str.charAt(0).toLowerCase() + str.slice(1);
    return withFirstLowerLetter.replace(/-/gi, '');
};

export function transformToBundleEntry<R extends Resource>(config: FhirAxiosRequestConfig): BundleEntry<R> | null {
    const { method, url, data, params, headers = [] } = config;

    if (!method || !url) {
        return null;
    }
    const request = {
        method,
        url: isObject(params) ? url + '?' + buildQueryParams(params) : url,
    };

    ['If-Modified-Since', 'If-Match', 'If-None-Match', 'If-None-Exist'].forEach((header) => {
        if (headers[header]) {
            request[toCamelCase(header)] = isObject(headers[header])
                ? buildQueryParams(headers[header])
                : headers[header];
        }
    });

    return {
        ...(data ? { resource: data } : {}),
        request,
    };
}

export async function applyFHIRServices<T extends Resource, F = any>(
    requests: Array<FhirAxiosRequestConfig>,
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

export interface FhirAxiosRequestConfig extends AxiosRequestConfig {
    method?: BundleEntryRequest['method'];
}
