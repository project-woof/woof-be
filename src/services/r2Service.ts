export const r2Service = {
    get: async (key: string, env: Env): Promise<R2ObjectBody | null> => {
        try {
            return await env.PETSITTER_STORAGE.get(key);
        } catch (error) {
            console.error(`Failed to get object with key "${key}":`, error);
            return null;
        }
    },
    
    list: async (prefix: string, env: Env): Promise<R2Objects> => {
        try {
            return await env.PETSITTER_STORAGE.list({prefix: `${prefix}`,});
        } catch (error) {
            console.error(`Failed to get object with prefix "${prefix}":`, error);
            return {
                objects: [],
                delimitedPrefixes: [],
                truncated: false,
            } as R2Objects;
        }
    },

    put: async (key: string, file: Blob | string, env: Env): Promise<R2Object | null> => {
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

