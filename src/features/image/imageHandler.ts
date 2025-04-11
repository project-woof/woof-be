import { imageService } from "./imageService";

export const imageHandler = async (
    request: Request,
    env: Env
): Promise<Response> => {
    const url = new URL(request.url);

    // GET image by key
    if (
        url.pathname.startsWith("/image/getImage/") &&
        request.method === "GET"
    ) {
        const key = url.pathname.split("/").pop();
        if (!key) {
            return new Response("Key is required", { status: 400 });
        }
        const obj = await imageService.getImageByKey(key, env);
        if (!obj) {
            return new Response("Image not found", { status: 404 });
        }
        return new Response(obj.body, {
            headers: {
                "Content-Type": obj.httpMetadata?.contentType || "image/png",
                "Cache-Control": "public, max-age=3600",
            },
        });
    }

    // Image API Endpoint Not Found
    return new Response("Image API Endpoint Not Found", { status: 404 });
};
