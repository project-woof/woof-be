import { ImageList } from "@/types/imageTypes";
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
        const key = url.pathname.replace("/image/getImage/", "");
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

    // GET images keys by user ID (list of image keys)
    if (
        url.pathname.startsWith("/image/getByUserId/") &&
        request.method === "GET"
    ) {
        const userId = url.pathname.replace("/image/getByUserId/", "");
        if (!userId) {
            return new Response("User ID is required", { status: 400 });
        }

        const keys = await imageService.getImageKeysByUserId(userId, env);

        return Response.json({ images: keys }, { status: 200 });
    }

    // Create/Overwrite a image  
    if (
        url.pathname.startsWith("/image/createImage/") &&
        request.method === "POST"
    ) {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") ?? "profile";
        const userId = url.pathname.replace("/image/createImage/", "");

        if (!userId) {
            return new Response("User ID is required", { status: 400 });
        }

        const formData = await request.formData();
        const fileEntries = [...formData.entries()].filter(([k]) => k === "image");
        const invalidFiles = fileEntries.filter(([, v]) => !(v instanceof Blob));
        if (invalidFiles.length > 0) {
            return new Response("All image files must be image blobs.", { status: 400 });
        }

        const files = fileEntries.map(([, v]) => v as Blob);
        let keys: string[] = [];

        if (type === "petsitter") {
            let preserve: string[] = [];
    
            const preserveRaw = formData.get("preserve");
            if (typeof preserveRaw === "string") {
                try {
                    preserve = JSON.parse(preserveRaw);
                    keys = await imageService.createPetsitterImages(userId, files, preserve, env);
                } catch (error) {
                    console.error("Invalid JSON for 'preserve'", error);
                    return new Response("Invalid preserve format", { status: 400 });
                }
            } else if (files.length === 0) {
                return new Response("No image files or preserve data provided.", { status: 400 });
            }
        } else {
            if (files.length === 0) {
                return new Response("No image file uploaded for profile type", { status: 400 });
            }
            keys = await imageService.createProfileImage(userId, files[0], env);
        }

        return Response.json({ images: keys }, { status: 201 });
    }

    // DELETE an image by key
    if (
        url.pathname.startsWith("/image/deleteImage/") &&
        request.method === "DELETE"
    ) {
        const body = (await request.json()) as ImageList;
        const { keys } = body;
        if (!keys) {
            return new Response(JSON.stringify({ error: "Missing keys" }), {
                status: 400,
            });
        }

        const success = await imageService.deleteImageByKey(keys, env);

        if (!success) {
            return new Response("Failed to delete image", { status: 500 });
        }

        return new Response("Image deleted successfully", { status: 200 });
    }


    // Image API Endpoint Not Found
    return new Response("Image API Endpoint Not Found", { status: 404 });
};
