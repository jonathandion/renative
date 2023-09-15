import 'regenerator-runtime/runtime';
import 'source-map-support/register';

import Config from './core/contextManager/context';
import Analytics from './core/systemManager/analytics';

global.RNV_ANALYTICS = Analytics;

export * from './modules';
export * from './core/adapter';
export * from './core/engineManager';
export * from './core/platformManager';
export * from './core/pluginManager';
export * from './core/projectManager';
export * from './core/projectManager/workspace';
export * from './core/projectManager/buildHooks';
export * from './core/projectManager/migrator';
export * from './core/configManager';
export * from './core/configManager/schemeParser';
export * from './core/configManager/packageParser';
export * from './core/schemaManager';
export * from './core/runtimeManager';
export * from './core/templateManager';
export * from './core/integrationManager';
export * from './core/taskManager';
export * from './core/systemManager/npmUtils';
export * from './core/systemManager/gitUtils';
export * from './core/systemManager/objectUtils';
export * from './core/systemManager/exec';
export * from './core/systemManager/fileutils';
export * from './core/systemManager/doctor';
export * from './core/systemManager/logger';
export * from './core/systemManager/resolve';
export * from './core/systemManager/crypto';
export * from './core/common';
export * from './core/systemManager/utils';
export * from './core/constants';

//TYPES
export * from './core/engineManager/types';
export * from './core/contextManager/types';
export * from './core/pluginManager/types';
export * from './core/projectManager/types';
export * from './core/configManager/types';
export * from './core/taskManager/types';
export * from './core/systemManager/types';
export * from './core/types';

export { Analytics };

export default { Config };
