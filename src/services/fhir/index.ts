import { AxiosRequestConfig } from 'axios';
import { Reference, Resource, Bundle } from 'fhir/r4b';

import { RemoteDataResult } from '@beda.software/remote-data';

import { parseFHIRReference } from '../../utils/fhir';

export * from './apiConfigs';

// TODO: move to remote-data package
export type RequestService = <S = any, F = any>(config: AxiosRequestConfig<any>) => Promise<RemoteDataResult<S, F>>;

// This type-wrapper is used to wrap Resource to make `id` attr required
// It's needed when we make requests to the FHIR server - initially all resources
// have id non-mandatory, but after request (GET/POST etc) the returned resource always
// has id.
export type WithId<T extends Resource> = T & Required<Pick<T, 'id'>>;

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
    entries.forEach(function (entry) {
        const type = entry.resource!.resourceType;
        // @ts-expect-error
        if (!entriesByResourceType[type]) {
            // @ts-expect-error
            entriesByResourceType[type] = [];
        }
        // @ts-expect-error
        entriesByResourceType[type].push(entry.resource);
    });

    return new Proxy(entriesByResourceType, {
        // @ts-expect-error
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
