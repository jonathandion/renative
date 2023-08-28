import { prePublish } from './prePublish';

import { gitCommit, gitTag, gitCommitAndTag } from '@flexn/build-hooks-git';

const hooks = {
    prePublish,
    gitCommitAndTag,
    gitCommit,
    gitTag,
};

const pipes = {};

export { pipes, hooks };
