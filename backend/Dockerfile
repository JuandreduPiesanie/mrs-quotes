FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY MrsQuotes.slnx ./
COPY MrsQuotes.Api/MrsQuotes.Api.csproj MrsQuotes.Api/
COPY MrsQuotes.Models/MrsQuotes.Models.csproj MrsQuotes.Models/
COPY MrsQuotes.Client/MrsQuotes.Client.csproj MrsQuotes.Client/
COPY MrsQuotes.IntegrationTests/MrsQuotes.IntegrationTests.csproj MrsQuotes.IntegrationTests/
RUN dotnet restore MrsQuotes.Api/MrsQuotes.Api.csproj
COPY . .
RUN dotnet publish MrsQuotes.Api/MrsQuotes.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
EXPOSE 8080
ENTRYPOINT ["dotnet", "MrsQuotes.Api.dll"]
