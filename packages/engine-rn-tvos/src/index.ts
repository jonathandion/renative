import { generateEngineExtensions, generateEngineTasks, RnvEngine } from '@rnv/core';
import { Tasks as TasksSdkAndroid } from '@rnv/sdk-android';
import { Tasks as TasksSdkApple } from '@rnv/sdk-apple';
import taskRun from './tasks/taskRun';
import taskBuild from './tasks/taskBuild';
import taskStart from './tasks/taskStart';
import { withRNVBabel } from './adapters/babelAdapter';
import { withRNVMetro } from './adapters/metroAdapter';
import { withRNVRNConfig } from '@rnv/sdk-react-native';
//@ts-ignore
import CNF from '../renative.engine.json';

const Engine: RnvEngine = {
    tasks: generateEngineTasks([taskRun, taskBuild, taskStart, ...TasksSdkAndroid, ...TasksSdkApple]),
    config: CNF,
    runtimeExtraProps: {
        reactNativePackageName: 'react-native-tvos',
        reactNativeMetroConfigName: 'metro.config.js',
        xcodeProjectName: 'RNVApp',
    },
    projectDirName: '',
    serverDirName: '',
    platforms: {
        tvos: {
            defaultPort: 8089,
            extensions: generateEngineExtensions(['tvos.tv', 'tv', 'tvos', 'tv.native', 'native'], CNF),
        },
        androidtv: {
            defaultPort: 8084,
            extensions: generateEngineExtensions(
                ['androidtv.tv', 'tv', 'androidtv', 'android', 'tv.native', 'native'],
                CNF
            ),
        },
        firetv: {
            defaultPort: 8098,
            extensions: generateEngineExtensions(
                ['firetv.tv', 'androidtv.tv', 'tv', 'firetv', 'androidtv', 'android', 'tv.native', 'native'],
                CNF
            ),
        },
    },
};

export { withRNVMetro, withRNVBabel, withRNVRNConfig };

export default Engine;
