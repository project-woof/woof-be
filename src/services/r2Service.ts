export const getImage = async (key: string, env: Env): Promise<Response> => {
	const object = await env.PETSITTER_STORAGE.get(key);

	if (!object) {
		return new Response("Image not found", { status: 404 });
	}

	return new Response(object.body, {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=3600",
		},
	});
   
};
export const r2Service = {
	get: async (key: string, env: Env): Promise<R2ObjectBody | null> => {
        try {
            return await env.PETSITTER_STORAGE.get(key);
        } catch (error) {
            console.error(`Failed to get object with key "${key}":`, error);
            return null;
        }
    },

	put: async (key: string, file: any, env: Env): Promise<R2Object | null> => {
        try {
            return await env.PETSITTER_STORAGE.put(key, file);
        } catch (error) {
            console.error(`Failed to upload object with key "${key}":`, error);
            return null;
        }
    },

	delete: async (key: string, env: Env): Promise<boolean> => {
		try {
			await env.PETSITTER_STORAGE.delete(key);
			return true;
		} catch (error) {
			console.error(`Failed to delete key "${key}":`, error);
			return false;
		}
	},
};

