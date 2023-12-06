import { isSuccess, loading, notAsked, RemoteData, service } from '@beda.software/remote-data';
import { Resource, Bundle } from 'fhir/r4b';
import _ from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getFHIRResources, WithId } from '../services/fhir';
import { SearchParams } from '../services/search';

export interface PagerManager {
    loadNext: () => void;
    loadPrevious: () => void;
    loadPage: (page: number, params: SearchParams) => void;
    reload: () => void;
    hasNext: boolean;
    hasPrevious: boolean;
    currentPage: number;
}

export function usePager<T extends Resource>(
    resourceType: T['resourceType'],
    resourcesOnPage: number = 15,
    initialSearchParams: SearchParams = {},
    initialPage: number = 1
): [RemoteData<Bundle<T>>, PagerManager] {
    const [pageToLoad, setPageToLoad] = useState(initialPage);
    const [reloadsCount, setReloadsCount] = useState(0);
    const [searchParams, setSearchParams] = useState<SearchParams>(initialSearchParams);
    const [response, setResponse] = useState<RemoteData<Bundle<WithId<T>>>>(notAsked);

    useEffect(() => {
        if (!_.isEqual(initialSearchParams, searchParams)) {
            setSearchParams(initialSearchParams);
        }
    }, [initialSearchParams, searchParams]);

    const loadResources = useCallback(
        async (params: SearchParams) => {
            setResponse(loading);
            const r = await getFHIRResources(resourceType, {
                ...params,
                _count: resourcesOnPage,
            });
            setResponse(r);
        },
        [resourceType, resourcesOnPage]
    );

    useEffect(() => {
        (async () => await loadResources(searchParams))();
    }, [loadResources, searchParams, reloadsCount]);

    const nextUrl = useMemo(
        () => (isSuccess(response) ? response.data.link?.find((link) => link.relation === 'next')?.url : undefined),
        [response]
    );

    const previousUrl = useMemo(
        () => (isSuccess(response) ? response.data.link?.find((link) => link.relation === 'previous')?.url : undefined),
        [response]
    );

    const loadNext = useCallback(async () => {
        if (nextUrl) {
            setPageToLoad((currentPage) => currentPage + 1);
            const nextResponse = await service<Bundle<WithId<T>>>({
                url: nextUrl,
                method: 'GET',
            });

            setResponse(nextResponse);
        }
    }, [nextUrl]);

    const loadPrevious = useCallback(async () => {
        if (previousUrl) {
            setPageToLoad((currentPage) => currentPage - 1);
            const previousResponse = await service<Bundle<WithId<T>>>({
                url: previousUrl,
                method: 'GET',
            });

            setResponse(previousResponse);
        }
    }, [previousUrl]);

    const loadPage = useCallback(
        (page: number, newSearchParams: SearchParams) => {
            setPageToLoad(page);
            loadResources({
                ...searchParams,
                ...newSearchParams,
            });
        },
        [loadResources, searchParams]
    );

    const reload = useCallback(() => {
        setPageToLoad(1);
        setReloadsCount((c) => c + 1);
    }, []);

    return [
        response,
        {
            loadNext,
            loadPrevious,
            loadPage,
            reload,
            hasNext: !!nextUrl,
            hasPrevious: !!previousUrl,
            currentPage: pageToLoad,
        },
    ];
}
