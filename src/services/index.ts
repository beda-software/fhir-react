import { AxiosRequestConfig } from 'axios';
import { Bundle, Reference, Resource, ValueSet } from 'fhir/r4b';
import { NullableRecursivePartial } from 'services/fhir/apiConfigs';

import { RemoteDataResult, init as remoteDataInit } from '@beda.software/remote-data';

import { WithId } from './fhir';
import {
    applyFHIRService,
    applyFHIRServices,
    createFHIRResource,
    deleteFHIRResource,
    findFHIRResource,
    forceDeleteFHIRResource,
    getAllFHIRResources,
    getConcepts,
    getFHIRResource,
    getFHIRResources,
    patchFHIRResource,
    saveFHIRResource,
    saveFHIRResources,
    updateFHIRResource,
} from './fhir/api';
import { SearchParams } from './search';

export * from './fhir';
export * from './search';

export function initServices(baseURL?: string) {
    const { service, ...rest } = remoteDataInit(baseURL);

    return {
        createFHIRResource: async <R extends Resource>(
            resource: R,
            searchParams?: SearchParams
        ): Promise<RemoteDataResult<WithId<R>>> => {
            return await createFHIRResource<R>(service, resource, searchParams);
        },
        updateFHIRResource: async <R extends Resource>(
            resource: R,
            searchParams?: SearchParams
        ): Promise<RemoteDataResult<WithId<R>>> => {
            return await updateFHIRResource<R>(service, resource, searchParams);
        },
        getFHIRResource: async <R extends Resource>(reference: Reference): Promise<RemoteDataResult<WithId<R>>> => {
            return await getFHIRResource<R>(service, reference);
        },
        getFHIRResources: async <R extends Resource>(
            resourceType: R['resourceType'],
            searchParams: SearchParams,
            extraPath?: string
        ): Promise<RemoteDataResult<Bundle<WithId<R>>>> => {
            return await getFHIRResources<R>(service, resourceType, searchParams, extraPath);
        },
        getAllFHIRResources: async <R extends Resource>(
            resourceType: string,
            searchParams: SearchParams,
            extraPath?: string
        ): Promise<RemoteDataResult<Bundle<WithId<R>>>> => {
            return await getAllFHIRResources<R>(service, resourceType, searchParams, extraPath);
        },
        findFHIRResource: async <R extends Resource>(
            resourceType: R['resourceType'],
            searchParams: SearchParams,
            extraPath?: string
        ): Promise<RemoteDataResult<WithId<R>>> => {
            return await findFHIRResource<R>(service, resourceType, searchParams, extraPath);
        },
        saveFHIRResource: async <R extends Resource>(resource: R): Promise<RemoteDataResult<WithId<R>>> => {
            return await saveFHIRResource<R>(service, resource);
        },
        saveFHIRResources: async <R extends Resource>(
            resources: R[],
            bundleType: 'transaction' | 'batch'
        ): Promise<RemoteDataResult<Bundle<WithId<R>>>> => {
            return await saveFHIRResources<R>(service, resources, bundleType);
        },
        patchFHIRResource: async <R extends Resource>(
            resource: NullableRecursivePartial<R>,
            searchParams?: SearchParams
        ): Promise<RemoteDataResult<WithId<R>>> => {
            return await patchFHIRResource<R>(service, resource, searchParams);
        },
        deleteFHIRResource: async <R extends Resource>(resource: Reference): Promise<RemoteDataResult<WithId<R>>> => {
            return await deleteFHIRResource<R>(service, resource);
        },
        forceDeleteFHIRResource: async <R extends Resource>(
            resource: Reference
        ): Promise<RemoteDataResult<WithId<R>>> => {
            return await forceDeleteFHIRResource<R>(service, resource);
        },
        getConcepts: async (valueSetId: string, searchParams?: SearchParams): Promise<RemoteDataResult<ValueSet>> => {
            return await getConcepts(service, valueSetId, searchParams);
        },
        applyFHIRService: async <R extends Resource, F = any>(
            request: AxiosRequestConfig
        ): Promise<RemoteDataResult<WithId<R>, F>> => {
            return await applyFHIRService<R, F>(service, request);
        },
        applyFHIRServices: async <R extends Resource, F = any>(
            requests: Array<AxiosRequestConfig>,
            type: 'transaction' | 'batch' = 'transaction'
        ): Promise<RemoteDataResult<Bundle<WithId<R>>, F>> => {
            return await applyFHIRServices<R, F>(service, requests, type);
        },
        service,
        ...rest,
    };
}
