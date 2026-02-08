import Dedalus, { DedalusRunner } from "dedalus-labs";

const dedalus = new Dedalus({
  apiKey: process.env.DEDALUS_API_KEY!,
});

export const runner = new DedalusRunner(dedalus);
export default dedalus;
