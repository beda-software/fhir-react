import { type AxiosRequestConfig } from 'axios';
import { BundleEntry, BundleEntryRequest, Reference, Resource } from 'fhir/r4b';
import _ from 'lodash';
import { SearchParams } from 'services/search';

import { buildQueryParams } from '@beda.software/remote-data';

import { parseFHIRReference } from '../../utils/fhir';

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

export function isObject(value: any): boolean {
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

export type NullableRecursivePartial<T> = {
    [P in keyof T]?: NullableRecursivePartial<T[P]> | null;
};

export function create<R extends Resource>(resource: R, searchParams?: SearchParams) {
    return {
        method: 'POST',
        url: `/${resource.resourceType}`,
        params: searchParams,
        data: resource,
    };
}

export function update<R extends Resource>(resource: R, searchParams?: SearchParams) {
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

export function get(reference: Reference) {
    return {
        method: 'GET',
        url: `/${reference.reference}`,
    };
}

export function list<R extends Resource>(
    resourceType: R['resourceType'],
    searchParams: SearchParams,
    extraPath?: string
) {
    return {
        method: 'GET',
        url: extraPath ? `/${resourceType}/${extraPath}` : `/${resourceType}`,
        params: { ...searchParams, ...getInactiveSearchParam(resourceType) },
    };
}

export function save<R extends Resource>(resource: R) {
    const versionId = resource.meta && resource.meta.versionId;

    return {
        method: resource.id ? 'PUT' : 'POST',
        data: resource,
        url: `/${resource.resourceType}${resource.id ? '/' + resource.id : ''}`,
        ...(resource.id && versionId ? { headers: { 'If-Match': versionId } } : {}),
    };
}

export function patch<R extends Resource>(resource: NullableRecursivePartial<R>, searchParams?: SearchParams) {
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

export function markAsDeleted(reference: Reference) {
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

export function forceDelete<R extends Resource>(
    resourceType: R['resourceType'],
    idOrSearchParams: string | SearchParams
) {
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

export function transformToBundleEntry<R extends Resource>(config: AxiosRequestConfig): BundleEntry<R> | null {
    const { method, url, data, params, headers = [] } = config;

    if (!method || !url) {
        return null;
    }
    const request = {
        method,
        url: isObject(params) ? url + '?' + buildQueryParams(params) : url,
    };

    ['If-Modified-Since', 'If-Match', 'If-None-Match', 'If-None-Exist'].forEach((header) => {
        // @ts-expect-error
        const customHeader: any = headers[header];
        if (customHeader) {
            // @ts-expect-error
            request[_.camelCase(header)] = isObject(headers[header]) ? buildQueryParams(customHeader) : customHeader;
        }
    });

    return {
        ...(data ? { resource: data } : {}),
        request: { ...request, method: request.method as BundleEntryRequest['method'] },
    };
}
