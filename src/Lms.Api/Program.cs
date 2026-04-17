using System.Text;
using Lms.Application.Auth;
using Lms.Application.Books;
using Lms.Application.Checkouts;
using Lms.Application.Search;
using Lms.Domain.Entities;
using Lms.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLmsInfrastructure(builder.Configuration);

builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<BookService>();
builder.Services.AddScoped<SearchService>();
builder.Services.AddScoped<CheckoutService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<JwtTokenGenerator>();

var jwtKey = builder.Configuration["Authentication:Jwt:Key"];
var jwtIssuer = builder.Configuration["Authentication:Jwt:Issuer"] ?? "LmsApi";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = string.IsNullOrEmpty(jwtKey)
                ? null
                : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddControllers();

var app = builder.Build();

var stripeKey = app.Configuration["Stripe:SecretKey"];
if (!string.IsNullOrEmpty(stripeKey))
    Stripe.StripeConfiguration.ApiKey = stripeKey;

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Make the implicit Program class accessible for integration tests.
public partial class Program { }
