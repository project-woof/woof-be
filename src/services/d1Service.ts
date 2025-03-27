export const d1Service = {
	executeQuery: async <T>(
		query: string,
		params: any[] = [],
		env: Env
	): Promise<T[]> => {
		try {
			const isSelectQuery = query.trim().toUpperCase().startsWith("SELECT");

			if (isSelectQuery) {
				const result = await env.PETSITTER_DB.prepare(query)
					.bind(...params)
					.all();
				return result.results as T[];
			}

			const result = await env.PETSITTER_DB.prepare(query)
				.bind(...params)
				.run();
			const changesResult = { changes: result.meta.changes };

			return [changesResult] as T[];
		} catch (error) {
			console.error("Error executing query:", error);
			throw new Error("Database query failed");
		}
	},
};
