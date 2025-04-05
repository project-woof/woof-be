export const d1Service = {
	executeQuery: async <T>(
		query: string,
		params: any[] = [],
		env: Env
	): Promise<T[]> => {
		try {
			// Check if the query is a SELECT or has a RETURNING clause
			const hasReturningClause = query.toUpperCase().includes("RETURNING");
			const isSelectQuery = query.trim().toUpperCase().startsWith("SELECT");

			if (isSelectQuery || hasReturningClause) {
				const result = await env.PETSITTER_DB.prepare(query)
					.bind(...params)
					.all();
				return result.results as T[];
			}
			// For INSERT, UPDATE, DELETE queries without RETURNING clause
			const result = await env.PETSITTER_DB.prepare(query)
				.bind(...params)
				.run();
			return result.results as T[];
		} catch (error) {
			console.error("Error executing query:", error);
			throw new Error("Database query failed");
		}
	},
};
