import { v7 as uuidv7 } from "uuid";

export const generateUUID = (parameter: string): string => {
	const generatedUUID = uuidv7().replace(/-/g, "");
	return `${parameter}_${generatedUUID}`;
};
