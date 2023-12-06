import { Resource } from 'fhir/r4b';
import { useEffect, useState, useCallback } from 'react';

import { RemoteData, failure, isFailure, isSuccess, loading, notAsked, success } from '@beda.software/remote-data';

import {
    deleteFHIRResource,
    extractBundleResources,
    getFHIRResource,
    getReference,
    makeReference,
    saveFHIRResource,
    saveFHIRResources,
} from '../services/fhir';

export interface CRUDManager<T> {
    handleSave: (updatedResource: T, relatedResources?: Resource[]) => Promise<RemoteData<T>>;
    handleDelete: (resourceToDelete: T) => void;
}

export function useCRUD<T extends Resource>(
    resourceType: T['resourceType'],
    id?: string,
    getOrCreate?: boolean,
    defaultResource?: Partial<T>
): [RemoteData<T>, CRUDManager<T>] {
    const [remoteData, setRemoteData] = useState<RemoteData<T>>(notAsked);

    const makeDefaultResource = useCallback(
        () => ({
            resourceType,
            ...(id && getOrCreate ? { id } : {}),
            ...defaultResource,
        }),
        [resourceType, defaultResource, id, getOrCreate]
    );

    useEffect(() => {
        (async () => {
            if (id) {
                setRemoteData(loading);
                const response = await getFHIRResource<T>(makeReference(resourceType, id));
                if (isFailure(response) && getOrCreate) {
                    setRemoteData(success(makeDefaultResource() as T));
                } else {
                    setRemoteData(response);
                }
            } else {
                setRemoteData(success(makeDefaultResource() as T));
            }
        })();
    }, [getOrCreate, id, makeDefaultResource, resourceType]);

    return [
        remoteData,
        {
            handleSave: async (updatedResource: T, relatedResources?: Resource[]) => {
                // Why do we need relatedResource here?
                // TODO refactor
                setRemoteData(loading);
                if (relatedResources && relatedResources.length) {
                    const bundleResponse = await saveFHIRResources(
                        [updatedResource, ...relatedResources],
                        'transaction'
                    );
                    if (isSuccess(bundleResponse)) {
                        const extracted = extractBundleResources(bundleResponse.data);
                        if (extracted) {
                            const resource = success(extracted[resourceType]![0]! as T);
                            setRemoteData(resource);
                            return resource;
                        } else {
                            return failure({ message: 'empty response from server' });
                        }
                    } else {
                        setRemoteData(bundleResponse);

                        return bundleResponse;
                    }
                } else {
                    const response = await saveFHIRResource(updatedResource);
                    setRemoteData(response);

                    return response;
                }
            },
            handleDelete: async (resourceToDelete: T) => {
                setRemoteData(loading);
                setRemoteData(await deleteFHIRResource(getReference(resourceToDelete)));
            },
        },
    ];
}
