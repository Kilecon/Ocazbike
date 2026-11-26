import { defineCase } from "../harness";

export default defineCase("users.list(all)", ({ users }) => users.list(false));
