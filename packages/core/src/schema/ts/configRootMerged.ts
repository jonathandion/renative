import type { NpmPackageFile } from '../../configs/types';
import type { _PlatformMergedType } from '../zod/configPlatforms';
import type { _PluginType } from '../zod/configPlugins';
import type { _RootAppSchemaPartialType } from '../zod/configRootApp';
import type { _RootGlobalSchemaType } from '../zod/configRootGlobal';
import type { _RootProjectSchemaPartialType } from '../zod/configRootProject';
import type { _RootProjectLocalSchemaPartialType } from '../zod/configRootProjectLocal';
import type { _RootTemplatesSchemaType } from '../zod/configRootTemplates';
// import type { RenativeConfigFile } from './types';

// NOTE: Why am I bothered with all this nonsense instead of just exporting root schema types?
// because infering full schema (complex zod types & unions) impacts TS server performance
// here I'm giving TS hand by offloading some of the heavy computations to predefined types and removing unions
// When all reantive json get merged into one file this happens conceptually anyway

export type ConfigRootMerged = _RootGlobalSchemaType & {
    pluginTemplates: Record<string, _RootTemplatesSchemaType>;
} & Required<_RootProjectSchemaPartialType> &
    _RootProjectLocalSchemaPartialType &
    _RootAppSchemaPartialType & {
        plugins: Record<string, _PluginType>;
        platforms: Record<string, _PlatformMergedType>;
    } & {
        projectTemplates?: object;
        engineTemplates?: Record<
            string,
            {
                version: string;
                id: string;
            }
        >;
        templateConfig?: {
            includedPaths?: string[];
            packageTemplate?: NpmPackageFile;
        };
    };

export const test = (test: ConfigRootMerged) => {
    console.log(test);

    const plugin = test.plugins['ss'];
    if (typeof plugin !== 'string') {
        console.log(plugin);
    }
};
