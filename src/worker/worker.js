importScripts('./jq.js');

onmessage = async (event) => {
    const {json, query} = event.data;
    // Interact with our web assembly module
    const res = await jq.json(json, query);
    postMessage(res);
}