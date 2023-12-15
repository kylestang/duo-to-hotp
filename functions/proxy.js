export async function onRequestPost(context) {
    let srcUrl = new URL(context.request.url);
    let rawUrl = decodeURIComponent(srcUrl.searchParams.get('url'));
    let dstUrl = new URL(rawUrl);

    if (! /^api-\w+\.duosecurity\.com$/.test(dstUrl.hostname)) {
        return new Response('Bad hostname', {status: 400});
    }

    console.log(dstUrl.toString());
    const newRequest = new Request(dstUrl.toString(), {method: 'POST'});
    
    const response = await fetch(newRequest)

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    const newResponse = new Response(response.body, {headers: newHeaders});

    return newResponse;
}
