import { r2Service } from "@/services/r2Service";

export const imageService = {
    // Get a image by key
    getImageByKey: async (key: string, env: Env): Promise<R2ObjectBody | null> => {
        return await r2Service.get(key, env)
    },

};
