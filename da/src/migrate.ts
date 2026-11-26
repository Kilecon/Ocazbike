import { prepareDatabase } from "./prepareDatabase";
import { loadRuntimeEnvironment } from "./shared/config/secrets";

const { sqlite } = await prepareDatabase(loadRuntimeEnvironment());
sqlite.close();
