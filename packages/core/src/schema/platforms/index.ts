import { z } from 'zod';
import { PlatformBase } from './base';
import { PlatformAndroid } from './android';
import { PlatformiOS } from './ios';
import { PlatformWeb } from './web';
import { PlatformTizen } from './tizen';
import { PlatformElectron } from './electron';
import { PlatformWindows } from './windows';
import { PlatformWebpack } from './webpack';
import { BuildSchemeBase } from '../shared';
import { PlatformNextJs } from './nextjs';
import { PlatformWebOS } from './webos';

const MergedPlatformPlainObject = BuildSchemeBase.merge(PlatformBase)
    .merge(PlatformiOS)
    .merge(PlatformAndroid)
    .merge(PlatformWeb)
    .merge(PlatformTizen)
    .merge(PlatformWebpack)
    .merge(PlatformElectron)
    .merge(PlatformWindows)
    .merge(PlatformWebOS)
    .merge(PlatformNextJs);

export type _MergedPlatformObjectType = z.infer<typeof MergedPlatformPlainObject>;

// LEVEL 2

// export const PlatformBuildSchemes = z
//     .record(z.string(), MergedPlatformPlainObject)
//     .describe('Allows to customize platforms configurations based on chosen build scheme `-s`');

// const PlatformMerged = MergedPlatformPlainObject.extend({
//     buildSchemes: z.optional(PlatformBuildSchemes),
// });
// export type _PlatformMergedType = z.infer<typeof PlatformMerged>;

// const generatePlatform = <T extends ZodObject>(schema: T) => {
//     return z.optional(
//         schema.extend({
//             buildSchemes: z
//                 .record(z.string(), schema)
//                 .optional()
//                 .describe('Allows to customize platforms configurations based on chosen build scheme `-s`'),
//         })
//     );
// };
const desc = 'Allows to customize platforms configurations based on chosen build scheme `-s`';

const androidSchema = z
    .optional(PlatformAndroid.extend({ buildSchemes: z.record(z.string(), PlatformAndroid) }))
    .describe(desc);
// const androidSchema = generatePlatform(PlatformAndroid);
const iosSchema = z.optional(PlatformiOS.extend({ buildSchemes: z.record(z.string(), PlatformiOS) })).describe(desc);
const tizenSchema = z
    .optional(PlatformTizen.extend({ buildSchemes: z.record(z.string(), PlatformTizen) }))
    .describe(desc);
const webSchema = z.optional(PlatformWeb.extend({ buildSchemes: z.record(z.string(), PlatformWeb) })).describe(desc);

const webosSchema = z
    .optional(PlatformWebOS.extend({ buildSchemes: z.record(z.string(), PlatformWebOS) }))
    .describe(desc);

export const Platforms = z
    .object({
        android: androidSchema,
        androidtv: androidSchema,
        androidwear: androidSchema,
        firetv: androidSchema,
        ios: iosSchema,
        tvos: iosSchema,
        tizen: tizenSchema,
        webos: webosSchema,
        web: webSchema,
        webtv: webSchema,
        chromecast: webSchema,
        kaios: webSchema,
        macos: webSchema,
        linux: webSchema,
        windows: webSchema,
        xbox: webSchema,
    })
    .describe('Object containing platform configurations');

export type _PlatformsType = z.infer<typeof Platforms>;
