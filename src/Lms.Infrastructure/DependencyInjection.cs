using Lms.Domain.Repositories;
using Lms.Infrastructure.Persistence;
using Lms.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Lms.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    // Per invariant #6, the connection string key is ConnectionStrings:LmsDatabase
    // both locally (Aspire injects it) and in prod (App Service Configuration).
    public const string ConnectionStringName = "LmsDatabase";

    public static IServiceCollection AddLmsInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName)
            ?? throw new InvalidOperationException(
                $"Missing ConnectionStrings:{ConnectionStringName}");

        services.AddDbContext<LmsDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddScoped<IBookRepository, BookRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICheckoutRepository, CheckoutRepository>();

        return services;
    }
}
