import { Bundle, Patient, Practitioner } from 'fhir/r4b';

import { failure, success } from '@beda.software/remote-data';

import { initServices } from '../../src/services';
import {
    getReference,
    makeReference,
    isReference,
    extractBundleResources,
    getIncludedResource,
    getIncludedResources,
    transformToBundleEntry,
} from '../../src/services/fhir';
import * as apiConfigs from '../../src/services/fhir/apiConfigs';

jest.mock('@beda.software/remote-data', () => {
    const originalModule = jest.requireActual('@beda.software/remote-data');
    return {
        __esModule: true,
        ...originalModule,
        init: jest.fn().mockReturnValue({
            service: jest.fn(() => Promise.resolve(success('data'))),
        }),
    };
});

describe('Service `fhir`', () => {
    // const { service } = init();
    const { service, ...services } = initServices();
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('method `create`', () => {
        test('create resource without search parameters`', async () => {
            const resource = {
                resourceType: 'Patient',
            };

            expect(apiConfigs.create(resource)).toEqual({
                method: 'POST',
                url: `/${resource.resourceType}`,
                data: resource,
            });
        });

        test('create resource with search parameters`', () => {
            const resource = {
                resourceType: 'Patient',
            };
            const searchParams = {
                param: 'value',
            };

            expect(apiConfigs.create(resource, searchParams)).toEqual({
                method: 'POST',
                url: `/${resource.resourceType}`,
                params: searchParams,
                data: resource,
            });
        });
    });

    test('method `createFHIRResource`', async () => {
        const resource = {
            id: '1',
            resourceType: 'Patient',
        };

        await services.createFHIRResource(resource);

        expect(service).toHaveBeenLastCalledWith(apiConfigs.create(resource));
    });

    describe('method `get`', () => {
        const resource = {
            reference: 'Patient/1',
        };

        expect(apiConfigs.get(resource)).toEqual({
            method: 'GET',
            url: '/Patient/1',
        });
    });

    test('method `getFHIRResource`', async () => {
        const reference = {
            id: '1',
            resourceType: 'Patient',
        };

        await services.getFHIRResource(reference);

        expect(service).toHaveBeenLastCalledWith(apiConfigs.get(reference));
    });

    describe('method `list`', () => {
        const params = { id: 2 };

        test('create axios config without extra path', () => {
            expect(apiConfigs.list('user', params)).toEqual({
                method: 'GET',
                url: '/user',
                params,
            });
        });

        test('create axios config with extra path', () => {
            expect(apiConfigs.list('user', params, 'extra')).toEqual({
                method: 'GET',
                url: '/user/extra',
                params,
            });
        });
    });

    describe('method `getFHIRResources`', () => {
        const params = { id: 2 };

        test('get resource without extra path', async () => {
            await services.getFHIRResources('user', params);

            expect(service).toHaveBeenLastCalledWith(apiConfigs.list('user', params));
        });

        test('get resource with extra path', async () => {
            await services.getFHIRResources('user', params, 'extra');

            expect(service).toHaveBeenLastCalledWith(apiConfigs.list('user', params, 'extra'));
        });
    });

    describe('method `update`', () => {
        test('update resource with meta versionId', () => {
            const resource = {
                resourceType: 'Patient',
                id: '1',
                meta: {
                    versionId: '1',
                },
            };

            expect(apiConfigs.update(resource)).toEqual({
                method: 'PUT',
                url: `/${resource.resourceType}/${resource.id}`,
                data: resource,
                headers: {
                    'If-Match': resource.meta.versionId,
                },
            });
        });
        test('update resource without meta versionId', () => {
            const resource = {
                resourceType: 'Patient',
                id: '1',
            };

            expect(apiConfigs.update(resource)).toEqual({
                method: 'PUT',
                url: `/${resource.resourceType}/${resource.id}`,
                data: resource,
            });
        });

        test('update resource without id', () => {
            const resource = {
                resourceType: 'Patient',
            };

            expect(() => {
                apiConfigs.update(resource);
            }).toThrow();
        });

        test('update resource without id with search params', () => {
            const resource = {
                resourceType: 'Patient',
            };
            const searchParams = { param: 'value' };

            expect(apiConfigs.update(resource, searchParams)).toEqual({
                method: 'PUT',
                url: `/${resource.resourceType}`,
                data: resource,
                params: searchParams,
            });
        });
    });

    test('method `updateFHIRResource`', async () => {
        const resource = {
            resourceType: 'Patient',
            id: '1',
        };
        const searchParams = { param: 'value' };

        await services.updateFHIRResource(resource, searchParams);

        expect(service).toHaveBeenLastCalledWith(apiConfigs.update(resource, searchParams));
    });

    describe('method `save`', () => {
        test('save resource without id', () => {
            const resource = {
                resourceType: 'Patient',
            };

            expect(apiConfigs.save(resource)).toEqual({
                method: 'POST',
                url: '/Patient',
                data: resource,
            });
        });

        test('save resource with id', () => {
            const resource = {
                resourceType: 'Patient',
                id: '1',
            };

            expect(apiConfigs.save(resource)).toEqual({
                method: 'PUT',
                url: '/Patient/1',
                data: resource,
            });
        });

        test('save resource with meta versionId', () => {
            const resource = {
                resourceType: 'Patient',
                id: '1',
                meta: {
                    versionId: '1',
                },
            };

            expect(apiConfigs.update(resource)).toEqual({
                method: 'PUT',
                url: `/${resource.resourceType}/${resource.id}`,
                data: resource,
                headers: {
                    'If-Match': resource.meta.versionId,
                },
            });
        });
    });

    describe('method `saveFHIRResource`', () => {
        test('save resource without id', async () => {
            const resource = {
                resourceType: 'Patient',
            };

            await services.saveFHIRResource(resource);

            expect(service).toHaveBeenLastCalledWith(apiConfigs.save(resource));
        });

        test('save resource with id', async () => {
            const resource = {
                resourceType: 'Patient',
                id: '1',
            };

            await services.saveFHIRResource(resource);

            expect(service).toHaveBeenLastCalledWith(apiConfigs.save(resource));
        });

        test('save resource with meta versionId', async () => {
            const resource = {
                resourceType: 'Patient',
                id: '1',
                meta: {
                    versionId: '1',
                },
            };

            await services.saveFHIRResource(resource);

            expect(service).toHaveBeenLastCalledWith(apiConfigs.save(resource));
        });
    });

    test('method `saveFHIRResources`', async () => {
        const bundleType = 'transaction';
        const resources = [
            { id: '1', resourceType: 'Patient' },
            { id: '2', resourceType: 'Patient' },
            { id: '3', resourceType: 'Patient', meta: { versionId: '1' } },
            { resourceType: 'Patient' },
        ];

        await services.saveFHIRResources(resources, bundleType);

        expect(service).toHaveBeenLastCalledWith({
            method: 'POST',
            url: '/',
            data: {
                resourceType: 'Bundle',
                type: bundleType,
                entry: [
                    {
                        request: {
                            method: 'PUT',
                            url: '/Patient/1',
                        },
                        resource: {
                            id: '1',
                            resourceType: 'Patient',
                        },
                    },
                    {
                        request: {
                            method: 'PUT',
                            url: '/Patient/2',
                        },
                        resource: {
                            id: '2',
                            resourceType: 'Patient',
                        },
                    },
                    {
                        request: {
                            method: 'PUT',
                            url: '/Patient/3',
                            ifMatch: '1',
                        },
                        resource: {
                            id: '3',
                            resourceType: 'Patient',
                            meta: {
                                versionId: '1',
                            },
                        },
                    },
                    {
                        request: {
                            method: 'POST',
                            url: '/Patient',
                        },
                        resource: {
                            resourceType: 'Patient',
                        },
                    },
                ],
            },
        });
    });

    describe('method `findFHIRResource`', () => {
        test('returns failure when nothing found', async () => {
            const params = { id: 1 };
            const resourceType = 'Patient';

            (<jest.Mock>service).mockResolvedValueOnce(success({ entry: [] }));

            const response = await services.findFHIRResource(resourceType, params);
            expect(service).toHaveBeenLastCalledWith({
                method: 'GET',
                url: `/${resourceType}`,
                params: { ...params, 'active:not': [false] },
            });
            expect(response).toEqual(
                failure({
                    error_description: 'No resources found',
                    error: 'no_resources_found',
                })
            );
        });

        test('returns failure when multiple resources found', async () => {
            const id = 'patient-id';
            const params = { _id: id };
            const resourceType = 'Patient';
            const resource = { resourceType, id };
            (<jest.Mock>service).mockResolvedValueOnce(success({ entry: [{ resource }, { resource }] }));

            const response = await services.findFHIRResource(resourceType, params);
            expect(service).toHaveBeenLastCalledWith({
                method: 'GET',
                url: `/${resourceType}`,
                params: { ...params, 'active:not': [false] },
            });
            expect(response).toEqual(
                failure({
                    error_description: 'Too many resources found',
                    error: 'too_many_resources_found',
                })
            );
        });

        test('returns success when exactly one resource found', async () => {
            const id = 'patient-id';
            const params = { _id: id };
            const resourceType = 'Patient';
            const resource = { resourceType, id };

            (<jest.Mock>service).mockResolvedValueOnce(success({ entry: [{ resource }] }));

            const response = await services.findFHIRResource(resourceType, params);
            expect(service).toHaveBeenLastCalledWith({
                method: 'GET',
                url: `/${resourceType}`,
                params: { ...params, 'active:not': [false] },
            });
            expect(response).toEqual(success(resource));
        });

        test('receive extra path argument', async () => {
            const params = { id: 1 };
            const resourceType = 'Patient';
            const extraPath = 'extraPath';

            await services.findFHIRResource(resourceType, params, extraPath);

            expect(service).toHaveBeenLastCalledWith({
                method: 'GET',
                url: `/${resourceType}/${extraPath}`,
                params: { ...params, 'active:not': [false] },
            });
        });
    });

    describe('method `patch`', () => {
        test('patch resource without search params', async () => {
            const resource = {
                id: '1',
                resourceType: 'Patient',
            };

            await services.patchFHIRResource(resource);

            expect(apiConfigs.patch(resource)).toEqual({
                method: 'PATCH',
                data: resource,
                url: `/${resource.resourceType}/${resource.id}`,
            });
        });

        test('patch resource with search params', async () => {
            const resource = {
                id: '1',
                resourceType: 'Patient',
            };
            const searchParams = { param: 'value' };

            await services.patchFHIRResource(resource);

            expect(apiConfigs.patch(resource, searchParams)).toEqual({
                method: 'PATCH',
                data: resource,
                url: `/${resource.resourceType}`,
                params: searchParams,
            });
        });

        test('patch resource without id', () => {
            const resource = {
                resourceType: 'Patient',
            };

            expect(() => {
                apiConfigs.patch(resource);
            }).toThrow();
        });
    });

    test('method `patchFHIRResource`', async () => {
        const resource = {
            id: '1',
            resourceType: 'Patient',
        };

        await services.patchFHIRResource(resource);

        expect(service).toHaveBeenLastCalledWith(apiConfigs.patch(resource));
    });

    describe('method `markAsDeleted`', () => {
        test('delete unknown resource', () => {
            const resource = {
                id: '1',
                resourceType: 'Unknown',
            };
            expect(() => {
                apiConfigs.markAsDeleted(resource);
            }).toThrow();
        });

        test('delete location resource', () => {
            const resource = {
                reference: 'Location/1',
            };

            expect(apiConfigs.markAsDeleted(resource)).toEqual({
                method: 'PATCH',
                url: `/Location/1`,
                data: {
                    status: 'inactive',
                },
            });
        });
    });

    describe('method `deleteFHIRResource`', () => {
        test('delete unknown resource', async () => {
            const resource = {
                id: '1',
                resourceType: 'Unknown',
            };
            expect(services.deleteFHIRResource(resource)).rejects.toThrow();
        });

        test('delete location resource', async () => {
            const resource = {
                reference: 'Location/1',
            };

            await services.deleteFHIRResource(resource);

            expect(service).toHaveBeenLastCalledWith(apiConfigs.markAsDeleted(resource));
        });
    });

    describe('method `forceDelete`', () => {
        test('delete resource by id', () => {
            const resourceType = 'Patient';
            const id = '1';

            expect(apiConfigs.forceDelete(resourceType, id)).toEqual({
                method: 'DELETE',
                url: `/${resourceType}/${id}`,
            });
        });

        test('delete resource by search params', () => {
            const resourceType = 'Patient';
            const searchParams = { id: '1' };

            expect(apiConfigs.forceDelete(resourceType, searchParams)).toEqual({
                method: 'DELETE',
                url: `/${resourceType}`,
                params: searchParams,
            });
        });
    });

    test('method `forceDeleteFHIRResource`', async () => {
        const resource = {
            reference: 'Patient/1',
        };

        await services.forceDeleteFHIRResource(resource);

        expect(service).toHaveBeenLastCalledWith(apiConfigs.forceDelete('Patient', '1'));
    });

    test('method `getReference`', () => {
        const id = '1';
        const resourceType = 'Patient';
        const resource = { id, resourceType };

        expect(getReference(resource)).toEqual({
            reference: `${resourceType}/${id}`,
        });

        expect(getReference(resource, 'value')).toEqual({
            reference: `${resourceType}/${id}`,
            display: 'value',
        });
    });

    test('method `makeReference`', () => {
        const id = '1';
        const resourceType = 'Patient';

        expect(makeReference(resourceType, id)).toEqual({ reference: `Patient/1` });
    });

    test('method `isReference`', () => {
        expect(
            isReference({
                reference: 'Patient/1',
            })
        ).toBeTruthy();

        expect(
            isReference({
                id: '1',
                resourceType: 'Patient',
            })
        ).toBeFalsy();

        expect(isReference({} as any)).toBeTruthy();
    });

    describe('method `extractBundleResources`', () => {
        test("extract empty object when there's not entry property", () => {
            const bundle: Bundle<Patient | Practitioner> = {
                resourceType: 'Bundle',
                type: 'searchset',
            };

            expect(extractBundleResources(bundle).Practitioner).toEqual([]);
            expect(extractBundleResources(bundle).Patient).toEqual([]);
        });
        test("extract bundle there's entry field property", () => {
            const bundle: Bundle<Patient | Practitioner> = {
                resourceType: 'Bundle',
                type: 'searchset',
                entry: [
                    {
                        resource: {
                            id: '1',
                            resourceType: 'Patient',
                        },
                    },
                    {
                        resource: {
                            id: '2',
                            resourceType: 'Patient',
                        },
                    },
                    {
                        resource: {
                            id: '3',
                            resourceType: 'Patient',
                        },
                    },
                    {
                        resource: {
                            id: '4',
                            resourceType: 'Practitioner',
                        },
                    },
                ],
            };

            expect(extractBundleResources(bundle)).toEqual({
                Patient: [
                    { id: '1', resourceType: 'Patient' },
                    { id: '2', resourceType: 'Patient' },
                    { id: '3', resourceType: 'Patient' },
                ],
                Practitioner: [{ id: '4', resourceType: 'Practitioner' }],
            });
        });
    });

    describe('method `getIncludedResource`', () => {
        const resources = {
            customType: [{ id: '1' }, { id: '3' }],
        };

        test('returns resource when it exists', () => {
            const reference = { reference: 'customType/1' };

            expect(getIncludedResource(resources, reference)).toEqual({ id: '1' });
        });

        test('returns resource when it exists', () => {
            const reference = { reference: 'customType/2' };

            expect(getIncludedResource(resources, reference)).toBeUndefined();
        });

        test("don't returns resource when it exists", () => {
            const reference = { reference: 'unknownType/3' };

            expect(getIncludedResource(resources, reference)).toBeUndefined();
        });
    });

    describe('method `getIncludedResources`', () => {
        test('returns resources when exists', async () => {
            const customTypeResources = [1, 2, 3];
            const resourceType = 'customType';
            const resources = {
                customType: customTypeResources,
            };

            expect(getIncludedResources(resources, resourceType)).toEqual(customTypeResources);
        });

        test("returns empty array when there aren't", async () => {
            const customTypeResources = [1, 2, 3];
            const resourceType = 'unknownType';
            const resources = {
                customType: customTypeResources,
            };

            expect(getIncludedResources(resources, resourceType)).toEqual([]);
        });
    });

    test('method `getConcepts`', async () => {
        const valueSetId = '1';
        const params = {
            a: 1,
            b: 2,
        };

        await services.getConcepts(valueSetId, params);

        expect(service).toHaveBeenLastCalledWith({
            method: 'GET',
            url: `/ValueSet/${valueSetId}/$expand`,
            params,
        });
    });

    test('method `applyFHIRService`', async () => {
        const resource = {
            resourceType: 'Patient',
        };

        const result = await services.applyFHIRService(apiConfigs.create(resource));

        expect(result).toEqual(success('data'));
    });

    describe('method `applyFHIRServices`', () => {
        test('apply transaction', async () => {
            const result = await services.applyFHIRServices([
                apiConfigs.create({
                    resourceType: 'Patient',
                }),
                apiConfigs.update({
                    resourceType: 'Patient',
                    id: '42',
                }),
                apiConfigs.forceDelete('Patient', '42'),
            ]);

            expect(service).toHaveBeenLastCalledWith({
                url: '/',
                method: 'POST',
                data: {
                    type: 'transaction',
                    entry: [
                        {
                            request: {
                                method: 'POST',
                                url: '/Patient',
                            },
                            resource: {
                                resourceType: 'Patient',
                            },
                        },
                        {
                            request: {
                                method: 'PUT',
                                url: '/Patient/42',
                            },
                            resource: {
                                resourceType: 'Patient',
                                id: '42',
                            },
                        },
                        {
                            request: {
                                method: 'DELETE',
                                url: '/Patient/42',
                            },
                        },
                    ],
                },
            });
            expect(result).toEqual(success('data'));
        });

        test('apply batch', async () => {
            const result = await services.applyFHIRServices([apiConfigs.forceDelete('Patient', '42')], 'batch');

            expect(service).toHaveBeenLastCalledWith({
                url: '/',
                method: 'POST',
                data: {
                    type: 'batch',
                    entry: [
                        {
                            request: {
                                method: 'DELETE',
                                url: '/Patient/42',
                            },
                        },
                    ],
                },
            });
            expect(result).toEqual(success('data'));
        });
    });

    describe('Method `transformToBundleEntry`', () => {
        test('returns null when config is empty', () => {
            const config = {};
            expect(transformToBundleEntry(config)).toBeNull();
        });

        test('process params', () => {
            const config = {
                url: '/',
                method: 'GET',
                params: { a: 42 },
            };

            expect(transformToBundleEntry(config as any)).toEqual({
                request: {
                    url: '/?a=42',
                    method: 'GET',
                },
            });
        });

        test('process data', () => {
            const config = {
                url: '/',
                method: 'POST',
                data: { a: 42 },
            };

            expect(transformToBundleEntry(config as any)).toEqual({
                resource: {
                    a: 42,
                },
                request: {
                    url: '/',
                    method: 'POST',
                },
            });
        });

        test('process `If-None-Exist` header', () => {
            const config = {
                url: '/',
                method: 'POST',
                data: {
                    resourceType: 'Patient',
                    id: '42',
                },
                headers: {
                    'If-None-Exist': { a: '42' },
                },
            };

            expect(transformToBundleEntry(config as any)).toEqual({
                resource: {
                    resourceType: 'Patient',
                    id: '42',
                },
                request: {
                    url: '/',
                    method: 'POST',
                    ifNoneExist: 'a=42',
                },
            });
        });

        test('process `If-Match` header', () => {
            const config = {
                url: '/',
                method: 'POST',
                data: {
                    resourceType: 'Patient',
                    id: '42',
                },
                headers: {
                    'If-Match': '41',
                },
            };

            expect(transformToBundleEntry(config as any)).toEqual({
                resource: {
                    resourceType: 'Patient',
                    id: '42',
                },
                request: {
                    url: '/',
                    method: 'POST',
                    ifMatch: '41',
                },
            });
        });
    });
});
