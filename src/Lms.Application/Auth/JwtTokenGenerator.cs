using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Lms.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Lms.Application.Auth;

public sealed class JwtTokenGenerator
{
    private const int TokenLifetimeHours = 8;
    private const string ConfigKeyJwtKey = "Authentication:Jwt:Key";
    private const string ConfigKeyJwtIssuer = "Authentication:Jwt:Issuer";

    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var key = _configuration[ConfigKeyJwtKey]
            ?? throw new InvalidOperationException($"Missing {ConfigKeyJwtKey}");

        var issuer = _configuration[ConfigKeyJwtIssuer] ?? "LmsApi";

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(TokenLifetimeHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
