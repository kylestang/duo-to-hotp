export async function onRequestPost(context) {
  const srcUrl = new URL(context.request.url);
  const rawUrl = decodeURIComponent(srcUrl.searchParams.get("url"));
  const dstUrl = new URL(rawUrl);

  if (!/^api-\w+\.duosecurity\.com$/.test(dstUrl.hostname)) {
    return new Response("Bad hostname", { status: 400 });
  }

  const newRequest = new Request(dstUrl, { method: "POST" });

  const response = await fetch(newRequest);

  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");

  const newResponse = new Response(response.body, { headers: newHeaders });

  return newResponse;
}
