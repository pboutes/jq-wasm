// Module worker: loads jq once and runs every query off the main thread.
// Gets {input, query}, both text, and replies with {ok: true, output}, what
// jq printed, or {ok: false, error}, jq's error message.
import createJq from './jq.js';

const jqReady = createJq();

onmessage = async (event) => {
    const {input, query} = event.data;
    try {
        const jq = await jqReady;
        postMessage({ok: true, output: jq.run(input, query)});
    } catch (e) {
        postMessage({ok: false, error: String(e && e.message ? e.message : e)});
    }
}
