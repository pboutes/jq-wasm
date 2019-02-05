importScripts('./jq.js');

onmessage = async (event) => {
    const {json, query} = event.data;
    // Interact with our web assembly module
    const t0 = performance.now();
    const res = await jq.json(json, query);
    const t1 = performance.now();
    console.log(`Process jq parsing in ${t1 - t0} ms`);
    postMessage(res);
}