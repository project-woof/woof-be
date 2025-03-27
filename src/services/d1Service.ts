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
			const results = {
				changes: result.meta.changes,
				last_row_id: result.meta.last_row_id,
			};

			return [results] as T[];
		} catch (error) {
			console.error("Error executing query:", error);
			throw new Error("Database query failed");
		}
	},
};
