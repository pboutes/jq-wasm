importScripts('./jq.js');

onmessage = async (event) => {
    const {json, query} = event.data;
    // Interact with our web assembly module
    try {
        const result = await jq.json(json, query);
        postMessage(result);
    } catch (e) {
        postMessage({error: e.message});
    }
}