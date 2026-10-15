// Minimale Deno-types voor de Edge Functions (die draaien in Deno bij Supabase), zodat tsc ze kan controleren.
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
