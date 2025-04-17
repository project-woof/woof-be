import { r2Service } from "@/services/r2Service";

export const imageService = {
    // Get a image by key
    getImageByKey: async (key: string, env: Env): Promise<R2ObjectBody | null> => {
        return await r2Service.get(key, env)
    },

    // Get petsitter images by user id
    getImageKeysByUserId: async (userId: string, env: Env): Promise<string[]> => {
        const list = await r2Service.list(`${userId}/petsitter/`, env)

        return list.objects.map((obj) => obj.key);
    },
    
    // Get profile key by user id
    getProfileKeysByUserId: async (userId: string, env: Env): Promise<string[]> => {
        const list = await r2Service.list(`${userId}/profile-image`, env)

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
        preserve: string[],
        env: Env
    ): Promise<string[]> => {
        const keys: string[] = [];
    
        // Extract preserved indexes like "1", "2", etc.
        const preservedIndexes = new Set(
            preserve.map((key) => {
                const match = key.match(/\/petsitter\/(\d+)$/);
                return match ? parseInt(match[1], 10) : null;
            }).filter((num): num is number => num !== null)
        );
    
        // Delete only non-preserved images
        const existing = await r2Service.list(`${userId}/petsitter/`, env);
        if (existing.objects.length > 0) {
            const deleteKeys = existing.objects
                .map((obj) => obj.key)
                .filter((key) => !preserve.includes(key));
    
            if (deleteKeys.length > 0) {
                await r2Service.delete(deleteKeys, env);
            }
        }
    
        // Upload new files to non-preserved slots
        let currentCount = 1;
        let uploadedCount = 0;
        const MAX_IMAGES = 6;
        const limit = Math.min(files.length, MAX_IMAGES - preservedIndexes.size);
    
        for (let i = 0; i < files.length && uploadedCount < limit; i++) {
            // Find the next available index not in preservedIndexes
            while (preservedIndexes.has(currentCount)) {
                currentCount++;
            }
    
            const key = `${userId}/petsitter/${currentCount}`;
            const uploaded = await r2Service.put(key, files[i], env);
            if (uploaded) {
                keys.push(key);
                uploadedCount++;
                currentCount++;
            }
        }
    
        // Return preserved keys and newly uploaded ones
        return [...preserve, ...keys];
    },

    // delete a image
    deleteImageByKey: async (keys: string[], env: Env): Promise<boolean> => {
        return await r2Service.delete(keys, env);
    },
    
};
