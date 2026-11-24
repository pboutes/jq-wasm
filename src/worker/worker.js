// Module worker: loads jq once and runs every query off the main thread.
// Replies with {ok: true, result} or {ok: false, error}, so a result that
// happens to be null or to contain an "error" key is never taken for a failure.
import createJq from './jq.js';

const jqReady = createJq();

onmessage = async (event) => {
    const {json, query} = event.data;
    try {
        const jq = await jqReady;
        postMessage({ok: true, result: await jq.parse(json)(query)});
    } catch (e) {
        postMessage({ok: false, error: String(e && e.message ? e.message : e)});
    }
}
