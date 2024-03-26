import {
    logToSummary,
    logTask,
    generateOptions,
    buildHooks,
    executeTask,
    RnvTaskFn,
    RnvTask,
    RnvTaskName,
} from '@rnv/core';

const fn: RnvTaskFn = async (c, _parentTask, originTask) => {
    logTask('taskHooksList');

    await executeTask(RnvTaskName.projectConfigure, RnvTaskName.hooksList, originTask);
    await buildHooks();

    if (c.buildHooks) {
        const hookOpts = generateOptions(c.buildHooks);
        let hooksAsString = `\n${'Hooks:'}\n${hookOpts.asString}`;

        if (c.buildPipes) {
            const pipeOpts = generateOptions(c.buildPipes);
            hooksAsString += `\n${'Pipes:'}\n${pipeOpts.asString}`;
        }
        logToSummary(hooksAsString);
        return;
    }
    return Promise.reject('Your buildHooks object is empty!');
};

const Task: RnvTask = {
    description: 'Get list of all available hooks',
    fn: async () => {},
    task: RnvTaskName.hooksList,
    forceBuildHookRebuild: true,
};

export default Task;
