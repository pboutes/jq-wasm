// Module worker: loads jq once and runs every query off the main thread.
import createJq from './jq.js';

const jqReady = createJq();

onmessage = async (event) => {
    const {json, query} = event.data;
    try {
        const jq = await jqReady;
        postMessage(await jq.parse(json)(query));
    } catch (e) {
        postMessage({error: String(e && e.message ? e.message : e)});
    }
}
