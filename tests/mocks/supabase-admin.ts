type SupabaseResult = {
  data: unknown;
  error: unknown;
};

type Filter = {
  op: "eq" | "lt";
  field: string;
  value: unknown;
};

export type QueryContext = {
  table: string;
  operation: "select" | "update" | "insert";
  columns?: string;
  payload?: unknown;
  filters: Filter[];
  orderBy?: { field: string; ascending?: boolean };
  limit?: number;
};

type QueryResolver = (context: QueryContext) => SupabaseResult | Promise<SupabaseResult>;
type RpcResolver = (args: unknown) => SupabaseResult | Promise<SupabaseResult>;

type MockOptions = {
  queries?: QueryResolver[];
  rpc?: Record<string, RpcResolver>;
};

class QueryBuilder implements PromiseLike<SupabaseResult> {
  private readonly context: QueryContext;
  private readonly executeQuery: (context: QueryContext) => Promise<SupabaseResult>;

  constructor(
    context: QueryContext,
    executeQuery: (context: QueryContext) => Promise<SupabaseResult>,
  ) {
    this.context = context;
    this.executeQuery = executeQuery;
  }

  public select = (columns: string): QueryBuilder => {
    this.context.operation = "select";
    this.context.columns = columns;
    return this;
  };

  public insert = (payload: unknown): Promise<SupabaseResult> => {
    this.context.operation = "insert";
    this.context.payload = payload;
    return this.executeQuery(this.context);
  };

  public update = (payload: unknown): QueryBuilder => {
    this.context.operation = "update";
    this.context.payload = payload;
    return this;
  };

  public eq = (field: string, value: unknown): QueryBuilder => {
    this.context.filters.push({ op: "eq", field, value });
    return this;
  };

  public lt = (field: string, value: unknown): QueryBuilder => {
    this.context.filters.push({ op: "lt", field, value });
    return this;
  };

  public order = (
    field: string,
    options?: { ascending?: boolean },
  ): QueryBuilder => {
    this.context.orderBy = { field, ascending: options?.ascending };
    return this;
  };

  public limit = async (limit: number): Promise<SupabaseResult> => {
    this.context.limit = limit;
    const result = await this.executeQuery(this.context);
    if (Array.isArray(result.data)) {
      return { ...result, data: result.data.slice(0, limit) };
    }
    return result;
  };

  public single = async (): Promise<SupabaseResult> => {
    const result = await this.executeQuery(this.context);
    if (Array.isArray(result.data)) {
      return { ...result, data: result.data[0] ?? null };
    }
    return result;
  };

  public maybeSingle = async (): Promise<SupabaseResult> => {
    const result = await this.executeQuery(this.context);
    if (Array.isArray(result.data)) {
      return { ...result, data: result.data[0] ?? null };
    }
    return result;
  };

  public then = <TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> => {
    return this.executeQuery(this.context).then(onfulfilled, onrejected);
  };
}

export const createSupabaseAdminMock = (options: MockOptions = {}) => {
  const calls: QueryContext[] = [];

  const executeQuery = async (context: QueryContext): Promise<SupabaseResult> => {
    calls.push({
      ...context,
      filters: [...context.filters],
    });

    for (const resolver of options.queries ?? []) {
      const result = await resolver(context);
      if (result) return result;
    }

    return { data: null, error: null };
  };

  return {
    from: (table: string) =>
      new QueryBuilder(
        {
          table,
          operation: "select",
          filters: [],
        },
        executeQuery,
      ),
    rpc: async (rpcName: string, args: unknown): Promise<SupabaseResult> => {
      const resolver = options.rpc?.[rpcName];
      if (!resolver) return { data: null, error: null };
      return resolver(args);
    },
    __calls: calls,
  };
};
