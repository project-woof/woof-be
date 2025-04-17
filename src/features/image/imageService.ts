import { r2Service } from "@/services/r2Service";

export const imageService = {
    // Get a image by key
    getImageByKey: async (key: string, env: Env): Promise<R2ObjectBody | null> => {
        return await r2Service.get(key, env)
    },

    // Get images by user id
    getImageKeysByUserId: async (userId: string, env: Env): Promise<string[]> => {
        const list = await r2Service.list(`${userId}/`, env)

        return list.objects.map((obj) => obj.key);
    },

    // Create a image
    createProfileImage: async (
        userId: string,
        file: Blob,
        env: Env
    ): Promise<string[]> => {
        const key = `${userId}/profile-image`;
        const uploaded = await r2Service.put(key, file, env);
        return uploaded ? [key] : [];
    },

    // create petsitter images
    createPetsitterImages: async (
        userId: string,
        files: Blob[],
        env: Env
    ): Promise<string[]> => {
        const keys: string[] = [];
        const existing = await r2Service.list(userId, env);

        if (existing.objects.length > 0) {
            const deleteKeys = existing.objects.map((obj) => obj.key);
            await r2Service.delete(deleteKeys, env);
        }
        let currentCount = 0;
        const MAX_IMAGES = 6
        const limit = files.length < MAX_IMAGES ? files.length : MAX_IMAGES

        for (let i = 0; i < limit; i++) {
            currentCount++
            const key = `${userId}/petsitter/${currentCount}`;
            const uploaded = await r2Service.put(key, files[i], env);
            if (uploaded) {
                keys.push(key);
            }
        }

        return keys;
    },

    // delete a image
    deleteImageByKey: async (keys: string[], env: Env): Promise<boolean> => {
        return await r2Service.delete(keys, env);
    },
    
};
