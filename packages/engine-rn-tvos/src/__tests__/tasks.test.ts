import { createRnvApi, createRnvContext, getContext, executeAsync, logError } from '@rnv/core';
import taskRnvRun from '../tasks/task.rnv.run';
import taskRnvStart from '../tasks/task.rnv.start';

jest.mock('fs');
jest.mock('axios');
jest.mock('@rnv/core');
jest.mock('@rnv/sdk-apple');
jest.mock('@rnv/sdk-android');
jest.mock('@rnv/sdk-utils');
jest.mock('@rnv/sdk-react-native');

beforeEach(() => {
    createRnvContext();
    createRnvApi();
});

afterEach(() => {
    jest.resetAllMocks();
});

const originTask = undefined;

test('Execute task.rnv.run', async () => {
    // GIVEN
    const ctx = getContext();
    jest.mocked(executeAsync).mockReturnValue(Promise.resolve('{}'));
    // WHEN
    const result = await taskRnvRun.fn?.(ctx, undefined, originTask);
    // THEN
    expect(result).toEqual(true);
    // expect(taskManager.executeTask).toHaveBeenCalledWith(c, 'project configure', 'platform list', originTask);
});

test('Execute task.rnv.start with no parent', async () => {
    // GIVEN
    const ctx = getContext();
    jest.mocked(executeAsync).mockReturnValue(Promise.resolve('{}'));
    // WHEN
    const result = await taskRnvStart.fn?.(ctx, undefined, originTask);
    // THEN
    expect(result).toEqual(true);
});

test('Execute task.rnv.start', async () => {
    // GIVEN
    const ctx = getContext();
    jest.mocked(executeAsync).mockReturnValue(Promise.resolve('{}'));
    // WHEN
    const result = await taskRnvStart.fn?.(ctx, 'parent', originTask);
    // THEN
    expect(executeAsync).toHaveBeenCalledWith(
        ctx,
        'node undefined/local-cli/cli.js start --port undefined --no-interactive --config=metro.config.js',
        {
            env: {},
            silent: true,
            stdio: 'inherit',
        }
    );
    expect(result).toEqual(true);
});

test('Execute task.rnv.start with metro failure', async () => {
    // GIVEN
    const ctx = getContext();
    jest.mocked(executeAsync).mockReturnValue(new Promise((resolve, reject) => reject('Metro failed')));
    // WHEN
    const result = await taskRnvStart.fn?.(ctx, 'parent', originTask);
    // THEN
    expect(executeAsync).toHaveBeenCalledWith(
        ctx,
        'node undefined/local-cli/cli.js start --port undefined --no-interactive --config=metro.config.js',
        {
            env: {},
            silent: true,
            stdio: 'inherit',
        }
    );
    expect(logError).toHaveBeenCalledWith('Metro failed', true);
    expect(result).toEqual(true);
});
