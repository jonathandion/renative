import path from 'path';
import merge from 'deepmerge';

import {
    RENATIVE_CONFIG_NAME,
    RENATIVE_CONFIG_PRIVATE_NAME,
    RENATIVE_CONFIG_LOCAL_NAME,
    RENATIVE_CONFIG_RUNTIME_NAME,
    RENATIVE_CONFIG_WORKSPACES_NAME,
    RENATIVE_CONFIG_PLUGINS_NAME,
    RENATIVE_CONFIG_TEMPLATES_NAME,
    RN_CLI_CONFIG_NAME,
    RN_BABEL_CONFIG_NAME,
    // PLATFORMS,
    USER_HOME_DIR,
    RNV_HOME_DIR,
    CURRENT_DIR,
} from '../constants';
import {
    mkdirSync,
    writeFileSync,
    readObjectSync,
    getRealPath,
    sanitizeDynamicRefs,
    sanitizeDynamicProps,
    mergeObjects,
    fsExistsSync,
    fsReadFileSync,
    fsReaddirSync,
    fsLstatSync,
    loadFile,
    formatBytes,
} from '../systemManager/fileutils';
import { getConfigProp } from '../common';
import { getWorkspaceDirPath } from '../projectManager/workspace';
import { chalk, logError, logTask, logWarning, logDebug } from '../systemManager/logger';
import { doResolve } from '../systemManager/resolve';
import { RnvConfigFileObj, RnvConfigPathObj, RnvConfig, RnvFileKey } from './types';
import { generateConfigBase } from './configBase';
// import { loadPluginTemplates } from '../pluginManager';

const IGNORE_FOLDERS = ['.git'];

export const checkIsRenativeProject = (c: RnvConfig) =>
    new Promise((resolve, reject) => {
        if (!c.paths.project.configExists) {
            return reject(
                `This directory is not ReNative project. Project config ${chalk().white(
                    c.paths.project.config
                )} is missing!. You can create new project with ${chalk().white('rnv new')}`
            );
        }

        return resolve(true);
    });

const _generateConfigPaths = (pathObj: RnvConfigPathObj, dir: string, configName?: string) => {
    pathObj.dir = dir;
    pathObj.config = path.join(dir, configName || RENATIVE_CONFIG_NAME);
    pathObj.configLocal = path.join(dir, RENATIVE_CONFIG_LOCAL_NAME);
    pathObj.configPrivate = path.join(dir, RENATIVE_CONFIG_PRIVATE_NAME);
    pathObj.appConfigsDir = path.join(dir, '..');
};

const _arrayMergeOverride = (_destinationArray: Array<string>, sourceArray: Array<string>) => sourceArray;

const getEnginesPluginDelta = (c: RnvConfig) => {
    logDebug('getEnginesPluginDelta');

    if (!c.buildConfig) return;

    const enginePlugins: Record<string, any> = {};
    const missingEnginePlugins: Record<string, any> = {};

    const engineConfig = c.runtime.enginesByPlatform[c.platform]?.config;
    if (engineConfig?.plugins) {
        const ePlugins = Object.keys(engineConfig.plugins);

        if (ePlugins?.length) {
            ePlugins.forEach((pluginKey) => {
                if (!c.files?.project?.config?.[pluginKey]) {
                    missingEnginePlugins[pluginKey] = engineConfig.plugins[pluginKey];
                }
                enginePlugins[pluginKey] = engineConfig.plugins[pluginKey];
            });
        }
    }
    c.runtime.missingEnginePlugins = missingEnginePlugins;
    return enginePlugins;
};

export const writeRenativeConfigFile = (c: RnvConfig, configPath: string, configData: string | object) => {
    logDebug(`writeRenativeConfigFile:${configPath}`);
    writeFileSync(configPath, configData);
    generateBuildConfig(c);
};

export const generateBuildConfig = (c: RnvConfig) => {
    logDebug('generateBuildConfig');

    const mergeOrder = [
        c.paths.defaultWorkspace.config,
        c.paths.rnv.projectTemplates.config,
        c.paths.rnv.pluginTemplates.config,
        // c.paths.rnv.platformTemplates.config,
        c.paths.workspace.config,
        c.paths.workspace.configPrivate,
        c.paths.workspace.configLocal,
        c.paths.workspace.project.config,
        c.paths.workspace.project.configPrivate,
        c.paths.workspace.project.configLocal,
        ...c.paths.workspace.appConfig.configs,
        ...c.paths.workspace.appConfig.configsPrivate,
        ...c.paths.workspace.appConfig.configsLocal,
        c.paths.project.config,
        c.paths.project.configPrivate,
        c.paths.project.configLocal,
        ...c.paths.appConfig.configs,
        ...c.paths.appConfig.configsPrivate,
        ...c.paths.appConfig.configsLocal,
    ];
    const cleanPaths = mergeOrder.filter((v) => v);
    const existsPaths = cleanPaths.filter((v) => {
        const exists = fsExistsSync(v);
        if (exists) {
            logDebug(`Merged: ${v}`);
        } else {
            // console.log(chalk().red(v));
        }
        return exists;
    });

    const pluginTemplates: Record<string, any> = {};
    if (c.files.rnv.pluginTemplates.configs) {
        Object.keys(c.files.rnv.pluginTemplates.configs).forEach((v) => {
            const plgs = c.files.rnv.pluginTemplates.configs[v];
            pluginTemplates[v] = plgs;
        });
    }

    const extraPlugins = getEnginesPluginDelta(c);

    const mergeFiles = [
        c.files.defaultWorkspace.config,
        c.files.rnv.projectTemplates.config,
        { plugins: extraPlugins },
        // { pluginTemplates },
        c.files.workspace.config,
        c.files.workspace.configPrivate,
        c.files.workspace.configLocal,
        c.files.workspace.project.config,
        c.files.workspace.project.configPrivate,
        c.files.workspace.project.configLocal,
        ...c.files.workspace.appConfig.configs,
        ...c.files.workspace.appConfig.configsPrivate,
        ...c.files.workspace.appConfig.configsLocal,
        c.files.project.config,
        c.files.project.configPrivate,
        c.files.project.configLocal,
        ...c.files.appConfig.configs,
        ...c.files.appConfig.configsPrivate,
        ...c.files.appConfig.configsLocal,
    ];

    // mergeFiles.forEach((mergeFile, i) => {
    //     console.log(`MERGEDIAGNOSTICS ${i}`, Object.keys(mergeFile?.plugins || {}));
    // });

    const meta = [
        {
            _meta: {
                generated: new Date().getTime(),
                mergedConfigs: existsPaths,
            },
        },
    ];
    const existsFiles = mergeFiles.filter((v) => v);

    logDebug(
        `generateBuildConfig:mergeOrder.length:${mergeOrder.length},cleanPaths.length:${cleanPaths.length},existsPaths.length:${existsPaths.length},existsFiles.length:${existsFiles.length}`
    );

    let out: any = merge.all([...meta, ...existsFiles], {
        arrayMerge: _arrayMergeOverride,
    });
    out = merge({}, out);
    out.pluginTemplates = pluginTemplates;

    c.buildConfig = sanitizeDynamicRefs(c, out);
    const propConfig = {
        files: c.files,
        runtimeProps: c.runtime,
        props: c.buildConfig._refs,
        configProps: c.configPropsInjects,
    };
    c.buildConfig = sanitizeDynamicProps(c.buildConfig, propConfig);

    logDebug('BUILD_CONFIG', Object.keys(c.buildConfig));

    if (c.runtime.appId) {
        c.paths.project.builds.config = path.join(c.paths.project.builds.dir, `${c.runtime.appId}_${c.platform}.json`);

        logDebug(`generateBuildConfig: will sanitize file at: ${c.paths.project.builds.config}`);

        if (c.paths.project.builds.dir) {
            if (!fsExistsSync(c.paths.project.builds.dir)) {
                mkdirSync(c.paths.project.builds.dir);
            }

            const result = writeFileSync(c.paths.project.builds.config, c.buildConfig);
            if (result) {
                const size = formatBytes(Buffer.byteLength(result || '', 'utf8'));
                logTask(chalk().grey('generateBuildConfig'), `size:${size}`);
            } else {
                logDebug(`generateBuildConfig NOT SAVED: ${c.paths.project.builds.config}`);
            }
        } else {
            logWarning('Cannot save buildConfig as c.paths.project.builds.dir is not defined');
        }
    }
};

export const loadFileExtended = (
    c: RnvConfig,
    fileObj: Record<string, any>,
    pathObj: RnvConfigPathObj,
    key: RnvFileKey
) => {
    const result = loadFile(fileObj, pathObj, key);
    if (fileObj[key]) {
        fileObj[`${key}_original`] = { ...fileObj[key] };
    }
    const extendsTemplate = fileObj[key]?.extendsTemplate;
    if (extendsTemplate) {
        let currTemplate = c.files.project[key].currentTemplate || fileObj[key].currentTemplate;
        if (!currTemplate) {
            if (extendsTemplate.startsWith('@')) {
                currTemplate = extendsTemplate.split('/').slice(0, 2).join('/');
            } else {
                currTemplate = extendsTemplate.split('/').slice(0, 1);
            }
        }
        if (currTemplate) {
            const currTemplateRes = doResolve(currTemplate);
            if (currTemplateRes) {
                let extendsPath;
                if (extendsTemplate.startsWith(currTemplate)) {
                    extendsPath = path.join(currTemplateRes, extendsTemplate.replace(currTemplate, ''));
                } else {
                    extendsPath = path.join(currTemplateRes, extendsTemplate);
                }

                if (fsExistsSync(extendsPath)) {
                    const extendsFile = readObjectSync(extendsPath);

                    fileObj[key] = mergeObjects(c, extendsFile, fileObj[key], false, true);
                    // CLEAN props which should not be inherited
                    delete fileObj[key].isTemplate;
                    delete fileObj[key].tasks;
                } else {
                    logWarning(`You are trying to extend config file with ${extendsPath} does not exists. SKIPPING.`);
                }
            } else {
                logWarning(`Cannot resolve currentTemplate ${currTemplate} `);
            }
        }
    }
    return result;
};

const _loadConfigFiles = (
    c: RnvConfig,
    fileObj: RnvConfigFileObj,
    pathObj: RnvConfigPathObj,
    parseAppConfigs?: boolean
) => {
    let result = false;
    let extendAppId;
    if (loadFileExtended(c, fileObj, pathObj, 'config')) {
        extendAppId = fileObj.config.extend || extendAppId;
        result = true;
    }

    if (loadFileExtended(c, fileObj, pathObj, 'configLocal')) {
        extendAppId = fileObj.configLocal.extend || extendAppId;
        result = true;
    }

    if (loadFileExtended(c, fileObj, pathObj, 'configPrivate')) {
        extendAppId = fileObj.configPrivate.extend || extendAppId;
        result = true;
    }

    if (parseAppConfigs) {
        pathObj.dirs = [];
        pathObj.fontsDirs = [];
        pathObj.pluginDirs = [];
        pathObj.configs = [];
        pathObj.configsLocal = [];
        pathObj.configsPrivate = [];

        fileObj.configs = [];
        fileObj.configsLocal = [];
        fileObj.configsPrivate = [];
        const fileObj1: RnvConfigFileObj = {};

        // PATH1: appConfigs/base
        const path1 = path.join(pathObj.appConfigsDir, 'base');
        const pathObj1: RnvConfigPathObj = {
            config: path.join(path1, RENATIVE_CONFIG_NAME),
            configLocal: path.join(path1, RENATIVE_CONFIG_LOCAL_NAME),
            configPrivate: path.join(path1, RENATIVE_CONFIG_PRIVATE_NAME),
        };
        pathObj.dirs.push(path1);
        pathObj.fontsDirs.push(path.join(path1, 'fonts'));
        pathObj.pluginDirs.push(path.join(path1, 'plugins'));
        pathObj.configs.push(pathObj1.config);
        pathObj.configsPrivate.push(pathObj1.configPrivate);
        pathObj.configsLocal.push(pathObj1.configLocal);
        // FILE1: appConfigs/base
        loadFileExtended(c, fileObj1, pathObj1, 'config');
        loadFileExtended(c, fileObj1, pathObj1, 'configPrivate');
        loadFileExtended(c, fileObj1, pathObj1, 'configLocal');
        if (fileObj1.config) fileObj.configs.push(fileObj1.config);
        if (fileObj1.configPrivate) fileObj.configsPrivate.push(fileObj1.configPrivate);
        if (fileObj1.configLocal) fileObj.configsLocal.push(fileObj1.configLocal);

        if (fsExistsSync(pathObj.appConfigsDir)) {
            const appConfigsDirNames = fsReaddirSync(pathObj.appConfigsDir);
            if (parseAppConfigs && extendAppId && appConfigsDirNames.includes(extendAppId)) {
                const path2 = path.join(pathObj.appConfigsDir, extendAppId);
                const pathObj2: RnvConfigPathObj = {
                    config: path.join(path2, RENATIVE_CONFIG_NAME),
                    configLocal: path.join(path2, RENATIVE_CONFIG_LOCAL_NAME),
                    configPrivate: path.join(path2, RENATIVE_CONFIG_PRIVATE_NAME),
                };
                const fileObj2: RnvConfigFileObj = {};
                // PATH2: appConfigs/<extendConfig>
                pathObj.dirs.push(path2);
                pathObj.fontsDirs.push(path.join(path2, 'fonts'));
                pathObj.pluginDirs.push(path.join(path2, 'plugins'));
                pathObj.configs.push(pathObj2.config);
                pathObj.configsLocal.push(pathObj2.configLocal);
                pathObj.configsPrivate.push(pathObj2.configPrivate);
                // FILE2: appConfigs/<extendConfig>
                loadFileExtended(c, fileObj2, pathObj2, 'config');
                loadFileExtended(c, fileObj2, pathObj2, 'configPrivate');
                loadFileExtended(c, fileObj2, pathObj2, 'configLocal');

                if (fileObj2.config) fileObj.configs.push(fileObj2.config);
                if (fileObj2.configLocal) fileObj.configsLocal.push(fileObj2.configLocal);
                if (fileObj2.configPrivate) fileObj.configsPrivate.push(fileObj2.configPrivate);
            }
        }

        // PATH2: appConfigs/<appId>
        const path3 = pathObj.dir;
        pathObj.dirs.push(path3);
        pathObj.fontsDirs.push(path.join(path3, 'fonts'));
        pathObj.pluginDirs.push(path.join(path3, 'plugins'));
        pathObj.configs.push(path.join(path3, RENATIVE_CONFIG_NAME));
        pathObj.configsLocal.push(path.join(path3, RENATIVE_CONFIG_LOCAL_NAME));
        pathObj.configsPrivate.push(path.join(path3, RENATIVE_CONFIG_PRIVATE_NAME));
        // FILE3: appConfigs/<appId>
        loadFileExtended(c, fileObj, pathObj, 'config');
        loadFileExtended(c, fileObj, pathObj, 'configPrivate');
        loadFileExtended(c, fileObj, pathObj, 'configLocal');
        if (fileObj.config) fileObj.configs.push(fileObj.config);
        if (fileObj.configPrivate) fileObj.configsPrivate.push(fileObj.configPrivate);
        if (fileObj.configLocal) fileObj.configsLocal.push(fileObj.configLocal);
    }

    generateBuildConfig(c);
    return result;
};

export const generateRuntimeConfig = async (c: RnvConfig) => {
    logTask('generateRuntimeConfig');
    // c.assetConfig = {
    //     common: c.buildConfig.common,
    //     runtime: c.buildConfig.runtime
    // };
    c.assetConfig = mergeObjects(c, c.assetConfig, c.buildConfig.runtime || {});
    c.assetConfig = mergeObjects(c, c.assetConfig, c.buildConfig.common?.runtime || {});
    c.assetConfig = mergeObjects(c, c.assetConfig, c.buildConfig.platforms?.[c.platform]?.runtime || {});
    c.assetConfig = mergeObjects(c, c.assetConfig, getConfigProp(c, c.platform, 'runtime') || {});

    if (fsExistsSync(c.paths.project.assets.dir)) {
        const sanitizedConfig = sanitizeDynamicProps(c.assetConfig, {
            files: c.files,
            runtimeProps: c.runtime,
            props: {},
            configProps: c.configPropsInjects,
        });
        writeFileSync(c.paths.project.assets.config, sanitizedConfig);
        c.files.project.assets.config = sanitizedConfig;
    }
    return true;
};

export const generateLocalConfig = (c: RnvConfig, resetAppId?: boolean) => {
    logTask('generateLocalConfig', `resetAppId:${!!resetAppId}`);
    const configLocal = c.files.project.configLocal || {};
    configLocal._meta = configLocal._meta || {};
    if (resetAppId) {
        delete configLocal._meta.currentAppConfigId;
    } else {
        configLocal._meta.currentAppConfigId = c.runtime.appId;
    }
    c.files.project.configLocal = configLocal;
    writeFileSync(c.paths.project.configLocal, configLocal);
};

const _generatePlatformTemplatePaths = (c: RnvConfig) => {
    logTask('_generatePlatformTemplatePaths');
    if (!c.buildConfig.paths) {
        logWarning(`You're missing paths object in your ${chalk().red(c.paths.project.config)}`);
        c.buildConfig.paths = {};
    }

    const pt = c.buildConfig.paths.platformTemplatesDirs || c.buildConfig.platformTemplatesDirs || {};
    const result: Record<string, string> = {};

    if (c.buildConfig.defaults) {
        c.buildConfig.defaults.supportedPlatforms.forEach((platform: string) => {
            const engine = c.runtime.enginesByPlatform[platform];
            if (engine) {
                const originalPath = engine.originalTemplatePlatformsDir;

                if (originalPath) {
                    if (!pt[platform]) {
                        const pt1 = getRealPath(c, originalPath, 'platformTemplatesDir', originalPath);
                        if (pt1) result[platform] = pt1;
                    } else {
                        const pt2 = getRealPath(c, pt[platform], 'platformTemplatesDir', originalPath);
                        if (pt2) result[platform] = pt2;
                    }
                } else {
                    logWarning(`Platform ${chalk().red(platform)} not supported by any registered engine. SKIPPING...`);
                }
            }
        });
    } else {
        logWarning(`Your renative.json is missing property: ${chalk().red('defaults.supportedPlatforms')} `);
    }

    return result;
};

export const listAppConfigsFoldersSync = (c: RnvConfig, ignoreHiddenConfigs: boolean, appConfigsDirPath?: string) => {
    logTask('listAppConfigsFoldersSync', `ignoreHiddenConfigs:${!!ignoreHiddenConfigs}`);

    if (!c.paths?.project) return [];

    const dirPath = appConfigsDirPath || c.paths.project.appConfigsDir;

    if (!fsExistsSync(dirPath)) return [];
    const appConfigsDirs: Array<string> = [];
    fsReaddirSync(dirPath).forEach((dir) => {
        const appConfigDir = path.join(dirPath, dir);
        if (!IGNORE_FOLDERS.includes(dir) && fsLstatSync(appConfigDir).isDirectory()) {
            if (ignoreHiddenConfigs) {
                const appConfig = path.join(appConfigDir, RENATIVE_CONFIG_NAME);
                if (fsExistsSync(appConfig)) {
                    try {
                        const config = readObjectSync(appConfig);
                        if (config?.hidden !== true) {
                            appConfigsDirs.push(dir);
                        }
                    } catch (e) {
                        logWarning(`_listAppConfigsFoldersSync: ${e}`);
                    }
                }
            } else {
                appConfigsDirs.push(dir);
            }
        }
    });
    return appConfigsDirs;
};

const _loadWorkspacesSync = (c: RnvConfig) => {
    // CHECK WORKSPACES
    if (fsExistsSync(c.paths.rnv.configWorkspaces)) {
        logDebug(`${c.paths.rnv.configWorkspaces} file exists!`);
        c.files.rnv.configWorkspaces = readObjectSync(c.paths.rnv.configWorkspaces);

        if (!c.files.rnv.configWorkspaces) c.files.rnv.configWorkspaces = {};

        if (!c.files.rnv.configWorkspaces?.workspaces) {
            c.files.rnv.configWorkspaces.workspaces = {};
        }
        if (Object.keys(c.files.rnv.configWorkspaces.workspaces).length === 0) {
            logWarning(`No workspace found in ${c.paths.rnv.configWorkspaces}. Creating default rnv one for you`);
            c.files.rnv.configWorkspaces.workspaces = {
                rnv: {
                    path: c.paths.workspace.dir,
                },
            };
            writeFileSync(c.paths.rnv.configWorkspaces, c.files.rnv.configWorkspaces);
        }
    } else {
        logWarning(`Cannot find ${c.paths.rnv.configWorkspaces}. creating one..`);
        c.files.rnv.configWorkspaces = {
            workspaces: {
                rnv: {
                    path: c.paths.workspace.dir,
                },
            },
        };
        writeFileSync(c.paths.rnv.configWorkspaces, c.files.rnv.configWorkspaces);
    }
};

export const parseRenativeConfigs = async (c: RnvConfig) => {
    logTask('parseRenativeConfigs');
    // LOAD ./package.json
    loadFile(c.files.project, c.paths.project, 'package');

    // LOAD ./RENATIVE.*.JSON
    _loadConfigFiles(c, c.files.project, c.paths.project);

    if (c.runtime.appId) {
        c.paths.project.builds.config = path.join(c.paths.project.builds.dir, `${c.runtime.appId}_${c.platform}.json`);
    } else {
        c.paths.project.builds.config = path.join(c.paths.project.builds.dir, `<TBC>_${c.platform}.json`);
    }

    // LOAD ./platformBuilds/RENATIVE.BUILLD.JSON
    loadFile(c.files.project.builds, c.paths.project.builds, 'config');

    // LOAD WORKSPACE /RENATIVE.*.JSON
    const wsDir = getRealPath(c, await getWorkspaceDirPath(c));
    if (wsDir) {
        _generateConfigPaths(c.paths.workspace, wsDir);
        _loadConfigFiles(c, c.files.workspace, c.paths.workspace);
    }

    // LOAD DEFAULT WORKSPACE
    _generateConfigPaths(c.paths.defaultWorkspace, c.paths.GLOBAL_RNV_DIR);
    _loadConfigFiles(c, c.files.defaultWorkspace, c.paths.defaultWorkspace);

    // LOAD PROJECT TEMPLATES
    c.files.rnv.projectTemplates.config = readObjectSync(c.paths.rnv.projectTemplates.config);

    // // LOAD PLUGIN TEMPLATES
    // await loadPluginTemplates(c);

    if (!c.files.project.config) {
        logDebug(`BUILD_CONFIG: c.files.project.config does not exists. path: ${c.paths.project.config}`);
        return;
    }

    // LOAD WORKSPACE /[PROJECT_NAME]/RENATIVE.*.JSON
    if (!c.files.project.config.projectName) {
        return Promise.reject('Your renative.json is missing required property: projectName ');
    }
    _generateConfigPaths(
        c.paths.workspace.project,
        path.join(c.paths.workspace.dir, c.files.project.config.projectName)
    );
    _loadConfigFiles(c, c.files.workspace.project, c.paths.workspace.project);

    c.paths.workspace.project.appConfigBase.dir = path.join(c.paths.workspace.project.dir, 'appConfigs', 'base');

    c.paths.workspace.project.appConfigBase.dir_LEGACY = path.join(c.paths.workspace.project.dir, 'projectConfig');

    c.paths.project.platformTemplatesDirs = _generatePlatformTemplatePaths(c);

    if (c.runtime.appId) {
        if (!c.files.appConfig.config) {
            // _generateConfigPaths(
            //     c.paths.appConfig,
            //     path.join(c.paths.project.appConfigsDir, c.runtime.appId)
            // );
            _generateConfigPaths(c.paths.appConfig, c.runtime.appConfigDir);
            _loadConfigFiles(c, c.files.appConfig, c.paths.appConfig, true);
        }

        const workspaceAppConfigsDir = getRealPath(c, c.buildConfig.workspaceAppConfigsDir);
        c.paths.workspace.project.appConfigsDir =
            workspaceAppConfigsDir || path.join(c.paths.workspace.project.dir, 'appConfigs');

        _generateConfigPaths(
            c.paths.workspace.appConfig,
            path.join(c.paths.workspace.project.appConfigsDir, c.runtime.appId)
        );

        _loadConfigFiles(c, c.files.workspace.appConfig, c.paths.workspace.appConfig, true);

        loadFile(c.files.project.assets, c.paths.project.assets, 'config');

        // LOAD WORKSPACE /RENATIVE.*.JSON
        const wsPath = await getWorkspaceDirPath(c);
        if (wsPath) {
            const wsPathReal = getRealPath(c, wsPath);
            if (wsPathReal) {
                _generateConfigPaths(c.paths.workspace, wsPathReal);
                _loadConfigFiles(c, c.files.workspace, c.paths.workspace);
            }
        }

        generateLocalConfig(c);
        generateBuildConfig(c);
    }
};

export const createRnvConfig = (program: any, process: any, cmd: string, subCmd: string) => {
    const c: RnvConfig = generateConfigBase();

    global.RNV_CONFIG = c;

    c.program = program;
    c.process = process;
    c.command = cmd;
    c.subCommand = subCmd;
    // c.platformDefaults = PLATFORMS;

    c.paths.rnv.dir = RNV_HOME_DIR;

    c.paths.rnv.engines.dir = path.join(c.paths.rnv.dir, 'engineTemplates');
    c.paths.rnv.pluginTemplates.dir = path.join(c.paths.rnv.dir, 'pluginTemplates');

    c.paths.rnv.pluginTemplates.config = path.join(c.paths.rnv.pluginTemplates.dir, RENATIVE_CONFIG_PLUGINS_NAME);
    c.paths.rnv.projectTemplates.dir = path.join(c.paths.rnv.dir, 'coreTemplateFiles');
    c.paths.rnv.projectTemplates.config = path.join(c.paths.rnv.projectTemplates.dir, RENATIVE_CONFIG_TEMPLATES_NAME);
    c.paths.rnv.package = path.join(c.paths.rnv.dir, 'package.json');

    c.paths.rnv.projectTemplate.dir = path.join(c.paths.rnv.dir, 'coreTemplateFiles');
    c.files.rnv.package = JSON.parse(fsReadFileSync(c.paths.rnv.package).toString());

    c.platform = c.program.platform;
    c.paths.home.dir = USER_HOME_DIR;
    c.paths.GLOBAL_RNV_DIR = path.join(c.paths.home.dir, '.rnv');
    c.paths.GLOBAL_RNV_CONFIG = path.join(c.paths.GLOBAL_RNV_DIR, RENATIVE_CONFIG_NAME);
    c.paths.rnv.configWorkspaces = path.join(c.paths.GLOBAL_RNV_DIR, RENATIVE_CONFIG_WORKSPACES_NAME);

    if (!fsExistsSync(c.paths.GLOBAL_RNV_DIR)) {
        mkdirSync(c.paths.GLOBAL_RNV_DIR);
    }

    _generateConfigPaths(c.paths.project, CURRENT_DIR, c.program.configName);

    c.paths.buildHooks.dir = path.join(c.paths.project.dir, 'buildHooks/src');
    c.paths.buildHooks.dist.dir = path.join(c.paths.project.dir, 'buildHooks/dist');
    c.paths.buildHooks.index = path.join(c.paths.buildHooks.dir, 'index.js');
    c.paths.buildHooks.dist.index = path.join(c.paths.buildHooks.dist.dir, 'index.js');
    c.paths.project.nodeModulesDir = path.join(c.paths.project.dir, 'node_modules');
    c.paths.project.srcDir = path.join(c.paths.project.dir, 'src');
    c.paths.project.appConfigsDir = path.join(c.paths.project.dir, 'appConfigs');
    c.paths.project.package = path.join(c.paths.project.dir, 'package.json');
    c.paths.project.rnCliConfig = path.join(c.paths.project.dir, RN_CLI_CONFIG_NAME);
    c.paths.project.babelConfig = path.join(c.paths.project.dir, RN_BABEL_CONFIG_NAME);
    // c.paths.project.npmLinkPolyfill = path.join(
    //     c.paths.project.dir,
    //     'npm_link_polyfill.json'
    // );
    c.paths.project.appConfigBase.dir = path.join(c.paths.project.dir, 'appConfigs', 'base');
    c.paths.project.appConfigBase.pluginsDir = path.join(c.paths.project.appConfigBase.dir, 'plugins');
    c.paths.project.appConfigBase.fontsDir = path.join(c.paths.project.appConfigBase.dir, 'fonts');
    c.paths.project.appConfigBase.fontsDirs = [c.paths.project.appConfigBase.fontsDir];
    c.paths.project.assets.dir = path.join(c.paths.project.dir, 'platformAssets');
    c.paths.project.assets.runtimeDir = path.join(c.paths.project.assets.dir, 'runtime');
    c.paths.project.assets.config = path.join(c.paths.project.assets.dir, RENATIVE_CONFIG_RUNTIME_NAME);
    c.paths.project.builds.dir = path.join(c.paths.project.dir, 'platformBuilds');

    _generateConfigPaths(c.paths.workspace, c.paths.GLOBAL_RNV_DIR);

    // LOAD WORKSPACES
    try {
        _loadWorkspacesSync(c);
    } catch (e) {
        logError(e);
    }

    return c;
};
