// Aspire AppHost — dev-only orchestration. Never built in CI, never deployed.
var builder = DistributedApplication.CreateBuilder(args);

// SQL Server 2025 container with a persistent named Docker volume so the dev
// catalog survives Ctrl+C and reboots. The database resource name
// "LmsDatabase" MUST match ConnectionStrings:LmsDatabase — Aspire injects the
// connection string into child processes under that exact key via
// WithReference (invariant #6).
var sql = builder.AddSqlServer("sql")
    .WithImage("mssql/server", "2025-latest")
    .WithLifetime(ContainerLifetime.Persistent)
    .WithDataVolume("lms-sql-data");

var db = sql.AddDatabase("LmsDatabase");

// One-shot migrations runner. Waits for the SQL container to be ready, then
// applies the schema. The api resource below cannot start until this process
// exits successfully (invariant #1: migrations never run at API startup).
var migrations = builder.AddProject<Projects.Lms_Migrations>("migrations")
    .WithReference(db)
    .WaitFor(db);

// API depends on migrations having COMPLETED, not just started. This is the
// load-bearing wiring for invariant #1.
var api = builder.AddProject<Projects.Lms_Api>("api")
    .WithReference(db)
    .WaitForCompletion(migrations);

// Vite dev server for the React client. Waits for the API so the /api proxy
// target is ready before the dev server starts accepting requests.
builder.AddNpmApp("client", "../../client", "dev")
    .WithHttpEndpoint(env: "PORT")
    .WaitFor(api);

builder.Build().Run();
