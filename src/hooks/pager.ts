import { Resource, Bundle } from 'fhir/r4b';
import _ from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { isSuccess, loading, notAsked, success, RemoteData, RequestService } from '@beda.software/remote-data';

import { WithId } from '../services/fhir';
import { getFHIRResources } from '../services/fhir/api';
import { SearchParams } from '../services/search';

export interface PagerManager<T extends Resource> {
    loadNext: () => void;
    loadPrevious: () => void;
    loadPage: (page: number, params: SearchParams) => void;
    reload: () => void;
    set: (customResponse: Bundle<WithId<T>>) => void;
    hasNext: boolean;
    hasPrevious: boolean;
    currentPage: number;
}

export interface UsePagerProps<T extends Resource> {
    resourceType: T['resourceType'];
    requestService: RequestService;
    resourcesOnPage?: number;
    initialSearchParams?: SearchParams;
    initialPage?: number;
}

export function usePager<T extends Resource>(props: UsePagerProps<T>): [RemoteData<Bundle<T>>, PagerManager<T>] {
    const { resourceType, requestService, initialPage = 1, initialSearchParams = {}, resourcesOnPage = 15 } = props;
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
            const r = await getFHIRResources<T>(requestService, resourceType, {
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
            const nextResponse = await requestService<Bundle<WithId<T>>>({
                url: nextUrl,
                method: 'GET',
            });

            setResponse(nextResponse);
        }
    }, [nextUrl]);

    const loadPrevious = useCallback(async () => {
        if (previousUrl) {
            setPageToLoad((currentPage) => currentPage - 1);
            const previousResponse = await requestService<Bundle<WithId<T>>>({
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

    const set = useCallback((customResponse: Bundle<WithId<T>>) => {
        setResponse(success(customResponse));
    }, []);

    const pagerManager: PagerManager<T> = {
        loadNext,
        loadPrevious,
        loadPage,
        reload,
        set,
        hasNext: !!nextUrl,
        hasPrevious: !!previousUrl,
        currentPage: pageToLoad,
    };

    return [response, pagerManager];
}
