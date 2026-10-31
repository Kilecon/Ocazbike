import { prepareDatabase } from "./prepareDatabase";

const { sqlite } = await prepareDatabase();
sqlite.close();
