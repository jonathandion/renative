import path from 'path';
import inquirer from 'inquirer';

import { chalk, logTask, logSuccess } from '../core/systemManager/logger';
import {
    writeFileSync,
    removeDirs
} from '../core/systemManager/fileutils';
import { generatePlatformChoices } from '../core/platformManager';
import { executeTask } from '../core/engineManager';
import { TASK_PROJECT_CONFIGURE, TASK_PLATFORM_CONNECT } from '../core/constants';

export const taskRnvPlatformConnect = async (c, parentTask, originTask) => {
    logTask('taskRnvPlatformConnect', `parent:${parentTask} origin:${originTask}`);

    await executeTask(c, TASK_PROJECT_CONFIGURE, TASK_PLATFORM_CONNECT, originTask);

    const { connectedPlatforms } = await inquirer.prompt({
        name: 'connectedPlatforms',
        message:
            'This will point platformTemplates folders from your local project to ReNative managed one. Select platforms you would like to connect',
        type: 'checkbox',
        choices: generatePlatformChoices(c).map(choice => ({
            ...choice,
            disabled: choice.isConnected
        }))
    });

    if (connectedPlatforms.length) {
        connectedPlatforms.forEach((platform) => {
            if (c.files.project.config.paths.platformTemplatesDirs?.[platform]) {
                delete c.files.project.config.paths.platformTemplatesDirs[platform];
            }

            if (
                !Object.keys(c.files.project.config.paths.platformTemplatesDirs)
                    .length
            ) {
                delete c.files.project.config.paths.platformTemplatesDirs; // also cleanup the empty object
            }

            writeFileSync(c.paths.project.config, c.files.project.config);
        });
    }

    const { deletePlatformFolder } = await inquirer.prompt({
        name: 'deletePlatformFolder',
        type: 'confirm',
        message:
            'Would you also like to delete the previously used platform folder?'
    });

    if (deletePlatformFolder) {
        const pathsToRemove = [];
        connectedPlatforms.forEach((platform) => {
            pathsToRemove.push(
                path.join(
                    c.paths.project.platformTemplatesDirs[platform],
                    platform
                )
            );
        });

        // TODO: Remove shared folders as well

        await removeDirs(pathsToRemove);
    }

    logSuccess(
        `${chalk().white(
            connectedPlatforms.join(',')
        )} now using ReNative platformTemplates located in ${chalk().white(
            c.paths.rnv.platformTemplates.dir
        )} now!`
    );
};

export default {
    description: '',
    fn: taskRnvPlatformConnect,
    task: TASK_PLATFORM_CONNECT,
    params: [],
    platforms: [],
};
