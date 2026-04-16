using Lms.Api.Endpoints;
using Lms.Application.Books;
using Lms.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLmsInfrastructure(builder.Configuration);
builder.Services.AddScoped<BookService>();

var app = builder.Build();

app.MapBooksEndpoints();

app.Run();

// Make the implicit Program class accessible for integration tests.
public partial class Program { }
