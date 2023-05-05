import { act, renderHook } from '@testing-library/react-hooks';
import { Bundle } from 'fhir/r4b';

import { PagerManager, usePager } from '../../src/hooks/pager';
import { RemoteData, success } from '../../src/libs/remoteData';
import { getFHIRResources } from '../../src/services/fhir';
import { SearchParams } from '../../src/services/search';
import { service } from '../../src/services/service';

jest.mock('../../src/services/fhir', () => ({ getFHIRResources: jest.fn() }));
jest.mock('../../src/hooks/service', () => ({ useService: jest.fn() }));
jest.mock('../../src/services/service', () => ({ service: jest.fn() }));

interface CheckPageParameters {
    callNumber: number;
    searchParams?: SearchParams;
}

describe('Hook `usePager`', () => {
    const resourceType = 'Bundle';
    const resourcesOnPage = 2;

    const checkCall = (parameters: CheckPageParameters) => {
        const { callNumber, searchParams = {} } = parameters;
        const [fhirResourceType, fhirSearchParams] = (<jest.Mock>getFHIRResources).mock.calls[callNumber];
        expect(fhirSearchParams).toEqual({ ...searchParams, _count: resourcesOnPage });
        expect(fhirResourceType).toEqual(resourceType);
    };

    const checkPage = (pageNumber: number, result: [RemoteData<Bundle<Bundle<any>>, any>, PagerManager]) => {
        const [, { currentPage }] = result;
        expect(currentPage).toBe(pageNumber);
    };

    // const checkPage = (parameters: CheckPageParameters) => {
    //     const { callNumber, pageNumber, searchParams = {} } = parameters;
    //     const [asyncFunction, [pageToLoad]] = (<jest.Mock>useEffect).mock.calls[callNumber];

    //     asyncFunction();

    //     const [fhirResourceType, fhirSearchParams] = (<jest.Mock>getFHIRResources).mock.calls[callNumber];
    //     expect(pageToLoad).toBe(pageNumber);
    //     expect(fhirSearchParams).toEqual({ ...searchParams, _count: resourcesOnPage, _page: pageNumber });
    //     expect(fhirResourceType).toEqual(resourceType);
    // };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('property `hasNext`', () => {
        test("returns false when there's no next page", async () => {
            const data = success({ resourceType });

            (<jest.Mock>getFHIRResources).mockImplementation(() => data);

            const { result, waitForNextUpdate } = renderHook(() => usePager<Bundle<any>>('Bundle'));

            await waitForNextUpdate();

            const [remoteData, { hasNext }] = result.current;

            expect(hasNext).toBeFalsy();
            expect(remoteData).toEqual(data);
        });

        test("returns true when there's next page", async () => {
            const data = success({
                id: 'fakeID',
                resourceType,
                link: [
                    {
                        relation: 'first',
                        url: '/EpisodeOfCare?page=1',
                    },
                    {
                        relation: 'next',
                        url: '/EpisodeOfCare?page=2',
                    },
                    {
                        relation: 'self',
                        url: '/EpisodeOfCare?page=1',
                    },
                ],
            });

            (<jest.Mock>getFHIRResources).mockImplementation(() => data);

            const { result, waitForNextUpdate } = renderHook(() =>
                usePager<Bundle<any>>(resourceType, resourcesOnPage)
            );

            await waitForNextUpdate();

            const [remoteData, { hasNext }] = result.current;

            expect(hasNext).toBeTruthy();
            expect(remoteData).toEqual(data);
        });
    });

    describe('property `hasPrevious`', () => {
        test("returns false when there's no previous page", async () => {
            const data = success({ resourceType });

            (<jest.Mock>getFHIRResources).mockImplementation(() => data);

            const { result, waitForNextUpdate } = renderHook(() => usePager<Bundle<any>>('Bundle'));

            await waitForNextUpdate();

            const [remoteData, { hasPrevious }] = result.current;

            expect(hasPrevious).toBeFalsy();
            expect(remoteData).toEqual(data);
        });

        test("returns true when there's previous page", async () => {
            const data = success({
                id: 'fakeID',
                resourceType,
                link: [
                    {
                        relation: 'first',
                        url: '/EpisodeOfCare?page=1',
                    },
                    {
                        relation: 'next',
                        url: '/EpisodeOfCare?page=3',
                    },
                    {
                        relation: 'self',
                        url: '/EpisodeOfCare?page=2',
                    },
                    {
                        relation: 'previous',
                        url: '/EpisodeOfCare?page=1',
                    },
                ],
            });

            (<jest.Mock>getFHIRResources).mockImplementation(() => data);

            const { result, waitForNextUpdate } = renderHook(() =>
                usePager<Bundle<any>>(resourceType, resourcesOnPage, { _page: 2 })
            );

            await waitForNextUpdate();

            const [remoteData, { hasPrevious }] = result.current;

            expect(hasPrevious).toBeTruthy();
            expect(remoteData).toEqual(data);
        });
    });

    test('method `loadNext`', async () => {
        const data1 = success({
            id: 'fakeID',
            resourceType,
            link: [
                {
                    relation: 'self',
                    url: '/EpisodeOfCare?page=1',
                },
                {
                    relation: 'next',
                    url: '/EpisodeOfCare?page=2',
                },
            ],
        });
        const data2 = success({
            id: 'fakeID',
            resourceType,
            link: [
                {
                    relation: 'previous',
                    url: '/EpisodeOfCare?page=1',
                },
                {
                    relation: 'self',
                    url: '/EpisodeOfCare?page=2',
                },
                {
                    relation: 'next',
                    url: '/EpisodeOfCare?page=3',
                },
            ],
        });

        const searchParams = { a: 1, b: 2 };

        (<jest.Mock>getFHIRResources).mockImplementation(() => data1);
        (<jest.Mock>service).mockImplementation(() => data2);

        const { result, waitForNextUpdate } = renderHook(() =>
            usePager<Bundle<any>>(resourceType, resourcesOnPage, searchParams)
        );

        await waitForNextUpdate();

        const [remoteData1, { loadNext }] = result.current;
        checkCall({ callNumber: 0, searchParams });
        checkPage(1, result.current);
        expect(remoteData1).toEqual(data1);

        await act(async () => loadNext());

        const [remoteData2] = result.current;
        checkPage(2, result.current);
        expect(remoteData2).toEqual(data2);
    });

    test('method `loadPrevious`', async () => {
        const data1 = success({
            id: 'fakeID',
            resourceType,
            link: [
                {
                    relation: 'first',
                    url: '/EpisodeOfCare?page=1',
                },
                {
                    relation: 'next',
                    url: '/EpisodeOfCare?page=3',
                },
                {
                    relation: 'self',
                    url: '/EpisodeOfCare?page=2',
                },
                {
                    relation: 'previous',
                    url: '/EpisodeOfCare?page=1',
                },
            ],
        });
        const data2 = success({
            id: 'fakeID',
            resourceType,
            link: [
                {
                    relation: 'self',
                    url: '/EpisodeOfCare?page=1',
                },
                {
                    relation: 'next',
                    url: '/EpisodeOfCare?page=2',
                },
            ],
        });

        const searchParams = { _page: 2 };
        const initialPage = 2;

        (<jest.Mock>getFHIRResources).mockImplementation(() => data1);
        (<jest.Mock>service).mockImplementation(() => data2);

        const { result, waitForNextUpdate } = renderHook(() =>
            usePager<Bundle<any>>(resourceType, resourcesOnPage, searchParams, initialPage)
        );

        await waitForNextUpdate();

        const [remoteData1, { loadPrevious }] = result.current;
        checkCall({ callNumber: 0, searchParams });
        checkPage(2, result.current);
        expect(remoteData1).toEqual(data1);

        await act(async () => loadPrevious());

        const [remoteData2] = result.current;
        checkPage(1, result.current);
        expect(remoteData2).toEqual(data2);
    });

    test('method `loadPage`', async () => {
        const data1 = success({
            id: 'fakeID',
            resourceType,
            link: [
                {
                    relation: 'first',
                    url: '/EpisodeOfCare?_page=1',
                },
                {
                    relation: 'self',
                    url: '/EpisodeOfCare?_page=1',
                },
                {
                    relation: 'next',
                    url: '/EpisodeOfCare?_page=2',
                },
                {
                    relation: 'last',
                    url: '/EpisodeOfCare?_page=6',
                },
            ],
        });
        const data2 = success({
            id: 'fakeID',
            resourceType,
            link: [
                {
                    relation: 'first',
                    url: '/EpisodeOfCare?_page=1',
                },
                {
                    relation: 'previous',
                    url: '/EpisodeOfCare?_page=2',
                },
                {
                    relation: 'self',
                    url: '/EpisodeOfCare?_page=3',
                },
                {
                    relation: 'next',
                    url: '/EpisodeOfCare?_page=4',
                },
                {
                    relation: 'last',
                    url: '/EpisodeOfCare?_page=6',
                },
            ],
        });

        (<jest.Mock>getFHIRResources).mockImplementationOnce(() => data1).mockImplementationOnce(() => data2);

        const { result, waitForNextUpdate } = renderHook(() => usePager<Bundle<any>>(resourceType, resourcesOnPage));

        await waitForNextUpdate();

        const [remoteData1, { loadPage }] = result.current;
        checkCall({ callNumber: 0 });
        checkPage(1, result.current);
        expect(remoteData1).toEqual(data1);

        await act(async () => {
            loadPage(3, {
                _page: 3,
            });
        });

        const [remoteData2] = result.current;
        checkCall({ callNumber: 1, searchParams: { _page: 3 } });
        checkPage(3, result.current);
        expect(remoteData2).toEqual(data2);
    });

    test('method `reload`', async () => {
        const data = success({
            id: 'fakeID',
            resourceType,
        });
        const searchParams = { a: 1, b: 2 };

        (<jest.Mock>getFHIRResources).mockImplementation(() => data);

        const { result, waitForNextUpdate } = renderHook(() =>
            usePager<Bundle<any>>(resourceType, resourcesOnPage, searchParams)
        );

        await waitForNextUpdate();

        const [, { reload }] = result.current;
        checkCall({ callNumber: 0, searchParams });
        checkPage(1, result.current);

        await act(async () => {
            reload();
        });

        checkCall({ callNumber: 1, searchParams });
        checkPage(1, result.current);
    });
});
