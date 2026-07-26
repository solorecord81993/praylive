import { SimulationConnector } from './simulationConnector.js';
import { normalizeEvent } from './eventNormalizer.js';

const connector = new SimulationConnector(raw => {
  const event = normalizeEvent(raw);
  if (event) console.log(JSON.stringify(event)); // Replace with a trusted Supabase publisher/Edge Function.
});
connector.connect();
process.on('SIGINT',()=>{connector.disconnect();process.exit(0)});
