import _ from 'lodash';

import { AidboxReference, AidboxResource, Bundle, ValueSet } from 'src/contrib/aidbox';

import { failure, RemoteDataResult } from '../libs/remoteData';
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

function getInactiveSearchParam(resourceType: string) {
    const item = inactiveMapping[resourceType];

    if (item) {
        return {
            [`${item.searchField}:not`]: [item.value],
        };
    }

    return {};
}

export async function getFHIRResource<R extends AidboxResource>(
    reference: AidboxReference<R>
): Promise<RemoteDataResult<R>> {
    return service({
        method: 'GET',
        url: `/${reference.resourceType}/${reference.id}`,
    });
}

export async function getFHIRResources<R extends AidboxResource>(
    resourceType: R['resourceType'],
    params: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<Bundle<R>>> {
    return service({
        method: 'GET',
        url: extraPath ? `/${resourceType}/${extraPath}` : `/${resourceType}`,
        params: { ...params, ...getInactiveSearchParam(resourceType) },
    });
}

export async function findFHIRResource<R extends AidboxResource>(
    resourceType: R['resourceType'],
    params: SearchParams,
    extraPath?: string
): Promise<RemoteDataResult<R>> {
    return await service({
        method: 'GET',
        url: extraPath ? `/${resourceType}/${extraPath}` : `/${resourceType}`,
        params: { ...params, ...getInactiveSearchParam(resourceType) },
        transformResponse: (resp: string) => {
            const data: Bundle<R> = JSON.parse(resp);
            const resources = data.entry!;
            if (resources.length === 1) {
                return resources[0].resource!;
            } else if (resources.length === 0) {
                throw new Error('No resources found');
            } else {
                throw new Error('Too many resources found');
            }
        },
    });
}

export async function saveFHIRResource<R extends AidboxResource>(resource: R): Promise<RemoteDataResult<R>> {
    const versionId = resource.meta && resource.meta.versionId;

    return service({
        method: resource.id ? 'PUT' : 'POST',
        data: resource,
        url: `/${resource.resourceType}${resource.id ? '/' + resource.id : ''}`,
        ...(resource.id && versionId ? { headers: { 'If-Match': versionId } } : {}),
    });
}

export async function saveFHIRResources<R extends AidboxResource>(
    resources: R[],
    bundleType: 'transaction' | 'batch'
): Promise<RemoteDataResult<Bundle<R>>> {
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

export async function patchFHIRResource<R extends AidboxResource>(
    resource: Partial<R> & Required<Pick<R, 'id' | 'resourceType'>>
): Promise<RemoteDataResult<R>> {
    return service({
        method: 'PATCH',
        data: resource,
        url: `/${resource.resourceType}/${resource.id}`,
    });
}

export async function deleteFHIRResource<R extends AidboxResource>(
    resource: AidboxReference<R>
): Promise<RemoteDataResult<R>> {
    const inactiveMappingItem = inactiveMapping[resource.resourceType];

    if (!inactiveMappingItem) {
        console.error(`Please specify inactiveMapping for ${resource.resourceType} to mark item deleted`);

        return failure({});
    }

    return service({
        method: 'PATCH',
        url: `/${resource.resourceType}/${resource.id}`,
        data: {
            [inactiveMappingItem.statusField]: inactiveMappingItem.value,
        },
    });
}

export async function forceDeleteFHIRResource<R extends AidboxResource>(
    resource: AidboxReference<R>,
    params?: SearchParams
): Promise<RemoteDataResult<R>> {
    return service({
        method: 'DELETE',
        url: `/${resource.resourceType}/${resource.id}`,
        params: params || {},
    });
}

export function getReference<T extends AidboxResource>(resource: T, display?: string): AidboxReference<T> {
    return {
        resourceType: resource.resourceType,
        id: resource.id!,
        ...(display ? { display } : {}),
    };
}

export function makeReference<T extends AidboxResource>(
    resourceType: string,
    id: string,
    display?: string
): AidboxReference<T> {
    return {
        resourceType,
        id,
        display,
    };
}

export function isReference<T extends AidboxResource>(
    resource: T | AidboxReference<T>
): resource is AidboxReference<T> {
    return !Object.keys(resource).filter(
        (resource) =>
            ['id', 'resourceType', '_id', 'resource', 'display', 'identifier', 'uri', 'localRef', 'extension'].indexOf(
                resource
            ) === -1
    ).length;
}

export type ResourcesMap<T extends AidboxResource> = { [x: string]: T[] | undefined };

export function extractBundleResources<T extends AidboxResource>(bundle: Bundle<T>): ResourcesMap<T> {
    const entriesByResourceType = {};

    bundle.entry?.forEach(function(entry) {
        const type = entry.resource!.resourceType;
        if (!entriesByResourceType[type]) {
            entriesByResourceType[type] = [];
        }
        entriesByResourceType[type].push(entry.resource);
    });

    return entriesByResourceType;
}

export function getIncludedResource<T extends AidboxResource>(
    // TODO: improve type for includedResources: must contain T
    resources: ResourcesMap<T | any>,
    reference: AidboxReference<T>
) {
    const typeResources = resources[reference.resourceType];
    const index = typeResources ? typeResources.findIndex((resource: T) => resource.id === reference.id) : -1;

    return typeResources && index !== -1 ? typeResources[index] : undefined;
}

export function getIncludedResources<T extends AidboxResource>(
    // TODO: improve type for includedResources: must contain T
    resources: ResourcesMap<T | any>,
    resourceType: T['resourceType']
): T[] {
    return (resources[resourceType] || []) as T[];
}

export function getConcepts(valueSetId: string, params?: SearchParams): Promise<RemoteDataResult<ValueSet>> {
    return service({
        method: 'GET',
        url: `/ValueSet/${valueSetId}/$expand`,
        params: { ...params },
    });
}
