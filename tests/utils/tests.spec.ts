import { failure, success } from '@beda.software/remote-data';

import { initServices } from '../../src/services';
import { ensure, withRootAccess } from '../../src/utils/tests';

describe('Util `tests`', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    describe('method `withRootAccess`', () => {
        const { axiosInstance } = initServices();
        test('correct async function', async () => {
            const fn = jest.fn(async () => {});

            const beforeAuth = axiosInstance.defaults.auth;

            await withRootAccess(axiosInstance, fn);

            expect(fn.mock.calls[0]).toEqual([]);
            expect(axiosInstance.defaults.auth).toEqual(beforeAuth);
        });

        test('async function with throw error', async () => {
            const fn = jest.fn(async () => {
                throw new Error('custom error');
            });

            await expect(withRootAccess(axiosInstance, fn)).rejects.toThrow(Error);

            expect(axiosInstance.defaults.auth).toBeUndefined();
        });
    });

    describe('method `ensure`', () => {
        const data = 'lorem ipsum';

        test('process `success` result', () => {
            expect(ensure(success(data))).toBe(data);
        });

        test('process not `success` result', () => {
            const fn = () => ensure(failure(data));

            expect(fn).toThrow(`Network error ${JSON.stringify(failure(data))}`);
        });
    });
});
